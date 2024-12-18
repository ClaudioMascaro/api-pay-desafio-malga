import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  CreatePaymentDto,
  PaymentResponse,
  PaymentStatus,
  RefundPaymentDto,
} from '../dto/payments.dto';
import {
  Provider1CreatePaymentDto,
  Provider1PaymentResponse,
} from './dto/provider1.dto';
import PaymentProviderStrategy from './payment-provider.interface';
import { lastValueFrom } from 'rxjs';
import { CircuitBreakerService } from '../../circuit-breaker/circuit-breaker.service';
import CircuitBreaker from 'opossum';
import { AxiosError } from 'axios';

@Injectable()
export class Provider1Strategy implements PaymentProviderStrategy {
  private apiUrl = this.configService.get<string>('payments.provider1.apiUrl');
  private requestTimeout = this.configService.get<number>(
    'payments.requestTimeout',
  );

  private readonly logger = new Logger(Provider1Strategy.name);
  private circuitBreaker: CircuitBreaker<[CreatePaymentDto], PaymentResponse>;

  private statusDictionary: { [key: string]: PaymentStatus } = {
    authorized: 'success',
    failed: 'refused',
    refunded: 'refunded',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    this.circuitBreaker = this.circuitBreakerService.createCircuitBreaker<
      [CreatePaymentDto],
      PaymentResponse
    >(async (dto) => this.executeRequest(dto));
  }

  async processPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    try {
      return await this.circuitBreaker.fire(createPaymentDto);
    } catch (error) {
      this.logger.error(`Provider 1 failed: ${error.message}`);
      throw error;
    }
  }

  private async executeRequest(
    createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    const provider1CreatePaymentDto: Provider1CreatePaymentDto = {
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      description: createPaymentDto.description,
      paymentMethod: {
        type: createPaymentDto.paymentMethod.type,
        card: {
          number: createPaymentDto.paymentMethod.card.number,
          holderName: createPaymentDto.paymentMethod.card.holderName,
          cvv: createPaymentDto.paymentMethod.card.cvv,
          expirationDate: createPaymentDto.paymentMethod.card.expirationDate,
          installments: createPaymentDto.paymentMethod.card.installments,
        },
      },
    };

    const response = await lastValueFrom(
      this.httpService.post<Provider1PaymentResponse>(
        this.apiUrl + '/charges',
        provider1CreatePaymentDto,
        { timeout: this.requestTimeout },
      ),
    );

    if (response.status >= 500) {
      throw new Error('error processing payment');
    }

    const { data } = response;

    return {
      id: data.id,
      createdDate: data.createdAt,
      status: this.statusDictionary[data.status],
      amount: data.currentAmount,
      originalAmount: data.originalAmount,
      currency: data.currency,
      description: data.description,
      paymentMethod: data.paymentMethod,
      cardId: data.cardId,
    };
  }

  async findPaymentById(id: string): Promise<PaymentResponse> {
    try {
      const response = await lastValueFrom(
        this.httpService.get<Provider1PaymentResponse>(
          this.apiUrl + '/charges/' + id,
          { timeout: this.requestTimeout },
        ),
      );

      const { data } = response;

      return {
        id: data.id,
        createdDate: data.createdAt,
        status: this.statusDictionary[data.status],
        amount: data.currentAmount,
        originalAmount: data.originalAmount,
        currency: data.currency,
        description: data.description,
        paymentMethod: data.paymentMethod,
        cardId: data.cardId,
      };
    } catch (error) {
      throw error;
    }
  }

  async refundPayment(
    id: string,
    { amount }: RefundPaymentDto,
  ): Promise<PaymentResponse> {
    try {
      const response = await lastValueFrom(
        this.httpService.post<Provider1PaymentResponse>(
          this.apiUrl + '/refund/' + id,
          { amount },
          { timeout: this.requestTimeout },
        ),
      );

      const { data } = response;

      return {
        id: data.id,
        createdDate: data.createdAt,
        status: this.statusDictionary[data.status],
        amount: data.currentAmount,
        originalAmount: data.originalAmount,
        currency: data.currency,
        description: data.description,
        paymentMethod: data.paymentMethod,
        cardId: data.cardId,
      };
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.status === 404 || axiosError.status >= 500) {
        throw axiosError;
      }

      if (axiosError.status === 400) {
        const data = axiosError.response.data as any;

        if (data.message === 'Charge cannot be refunded') {
          throw new BadRequestException('Payment cannot be refunded');
        }

        if (data.message === 'Refund amount is greater than the charge.') {
          throw new BadRequestException(
            'Refund amount is greater than payment amount',
          );
        }
      }

      throw error;
    }
  }
}
