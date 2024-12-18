import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
  PaymentStatus,
} from '../dto/create-payment.dto';
import {
  Provider1CreatePaymentDto,
  Provider1CreatePaymentResponse,
} from './dto/provider1.dto';
import PaymentProviderStrategy from './payment-provider.interface';
import { lastValueFrom } from 'rxjs';
import { CircuitBreakerService } from '../../circuit-breaker/circuit-breaker.service';
import CircuitBreaker from 'opossum';

@Injectable()
export class Provider1Strategy implements PaymentProviderStrategy {
  private readonly logger = new Logger(Provider1Strategy.name);
  private circuitBreaker: CircuitBreaker<
    [CreatePaymentDto],
    CreatePaymentResponse
  >;

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
      CreatePaymentResponse
    >(async (dto) => this.executeRequest(dto));
  }

  async processPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse> {
    try {
      return await this.circuitBreaker.fire(createPaymentDto);
    } catch (error) {
      this.logger.error(`Provider 1 failed: ${error.message}`);
      throw error;
    }
  }

  private async executeRequest(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse> {
    const apiUrl = this.configService.get<string>('payments.provider1.apiUrl');
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
      this.httpService.post<Provider1CreatePaymentResponse>(
        apiUrl + '/charges',
        provider1CreatePaymentDto,
        { timeout: 1000 },
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
      provider: 'provider1',
    };
  }
}
