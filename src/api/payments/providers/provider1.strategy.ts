import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CircuitBreakerService } from '../../circuit-breaker/circuit-breaker.service';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from '../dto/create-payment.dto';
import {
  Provider1CreatePaymentDto,
  Provider1CreatePaymentResponse,
} from './dto/provider1.dto';
import PaymentProviderStrategy from './payment-provider.interface';
import { lastValueFrom } from 'rxjs';
@Injectable()
export class Provider1Strategy implements PaymentProviderStrategy {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async processPayment(
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

    const { data } = await lastValueFrom(
      this.httpService.post<Provider1CreatePaymentResponse>(
        apiUrl + '/charges',
        provider1CreatePaymentDto,
        { timeout: 5000 },
      ),
    );

    return {
      id: data.id,
      createdDate: data.createdAt,
      status: 'success',
      amount: data.currentAmount,
      originalAmount: data.originalAmount,
      currency: data.currency,
      description: data.description,
      paymentMethod: 'card',
      cardId: data.cardId,
      provider: 'provider1',
    };
  }
}
