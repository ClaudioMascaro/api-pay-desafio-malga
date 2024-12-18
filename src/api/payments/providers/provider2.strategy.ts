import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CircuitBreakerService } from '../../circuit-breaker/circuit-breaker.service';
import {
  CreatePaymentDto,
  PaymentResponse,
  PaymentStatus,
  RefundPaymentDto,
} from '../dto/payments.dto';
import {
  Provider2CreatePaymentDto,
  Provider2PaymentResponse,
} from './dto/provider2.dto';
import { lastValueFrom } from 'rxjs';
import PaymentProviderStrategy from './payment-provider.interface';
import CircuitBreaker from 'opossum';
import { AxiosError } from 'axios';

@Injectable()
export class Provider2Strategy implements PaymentProviderStrategy {
  private apiUrl = this.configService.get<string>('payments.provider2.apiUrl');
  private requestTimeout = this.configService.get<number>(
    'payments.requestTimeout',
  );

  private readonly logger = new Logger(Provider2Strategy.name);
  private circuitBreaker: CircuitBreaker<[CreatePaymentDto], PaymentResponse>;

  private statusDictionary: { [key: string]: PaymentStatus } = {
    paid: 'success',
    failed: 'refused',
    voided: 'refunded',
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
      this.logger.error(`Provider 2 failed: ${error.message}`);
      throw error;
    }
  }

  private async executeRequest(
    createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponse> {
    const expirationArr =
      createPaymentDto.paymentMethod.card.expirationDate.split('/');

    const expirationMonth = expirationArr[0];
    const expirationYear = expirationArr[1].slice(-2);

    const provider2CreatePaymentDto: Provider2CreatePaymentDto = {
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      statementDescriptor: createPaymentDto.description,
      paymentType: createPaymentDto.paymentMethod.type,
      card: {
        number: createPaymentDto.paymentMethod.card.number,
        holder: createPaymentDto.paymentMethod.card.holderName,
        cvv: createPaymentDto.paymentMethod.card.cvv,
        expiration: `${expirationMonth}/${expirationYear}`,
        installmentNumber: createPaymentDto.paymentMethod.card.installments,
      },
    };

    const response = await lastValueFrom(
      this.httpService.post<Provider2PaymentResponse>(
        this.apiUrl + '/transactions',
        provider2CreatePaymentDto,
        { timeout: this.requestTimeout },
      ),
    );

    if (response.status >= 500) {
      throw new Error('error processing payment');
    }

    const { data } = response;

    return {
      id: data.id,
      createdDate: data.date,
      status: this.statusDictionary[data.status],
      amount: data.amount,
      originalAmount: data.originalAmount,
      currency: data.currency,
      description: data.statementDescriptor,
      paymentMethod: 'card',
      cardId: data.cardId,
    };
  }

  async findPaymentById(id: string): Promise<PaymentResponse> {
    try {
      const response = await lastValueFrom(
        this.httpService.get<Provider2PaymentResponse>(
          this.apiUrl + '/transactions/' + id,
          { timeout: this.requestTimeout },
        ),
      );

      const { data } = response;

      return {
        id: data.id,
        createdDate: data.date,
        status: this.statusDictionary[data.status],
        amount: data.amount,
        originalAmount: data.originalAmount,
        currency: data.currency,
        description: data.statementDescriptor,
        paymentMethod: 'card',
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
        this.httpService.post<Provider2PaymentResponse>(
          this.apiUrl + '/void/' + id,
          { amount },
          { timeout: this.requestTimeout },
        ),
      );

      const { data } = response;

      return {
        id: data.id,
        createdDate: data.date,
        status: this.statusDictionary[data.status],
        amount: data.amount,
        originalAmount: data.originalAmount,
        currency: data.currency,
        description: data.statementDescriptor,
        paymentMethod: 'card',
        cardId: data.cardId,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.status === 404 || axiosError.status >= 500) {
        throw axiosError;
      }

      if (axiosError.status === 400) {
        const data = axiosError.response.data as any;

        if (data.message === 'Transaction cannot be voided.') {
          throw new BadRequestException('Payment cannot be refunded');
        }

        if (data.message === 'Void amount is higher than transaction amount.') {
          throw new BadRequestException(
            'Refund amount is greater than payment amount',
          );
        }
      }

      throw error;
    }
  }
}
