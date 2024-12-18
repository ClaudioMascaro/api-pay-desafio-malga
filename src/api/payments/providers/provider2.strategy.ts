import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CircuitBreakerService } from '../../circuit-breaker/circuit-breaker.service';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from '../dto/create-payment.dto';
import {
  Provider2CreatePaymentDto,
  Provider2CreatePaymentResponse,
} from './dto/provider2.dto';
import { lastValueFrom } from 'rxjs';
import PaymentProviderStrategy from './payment-provider.interface';

@Injectable()
export class Provider2Strategy implements PaymentProviderStrategy {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async processPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse> {
    const apiUrl = this.configService.get<string>('payments.provider2.apiUrl');
    const provider2CreatePaymentDto: Provider2CreatePaymentDto = {
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      statementDescriptor: createPaymentDto.description,
      paymentType: createPaymentDto.paymentMethod.type,
      card: {
        number: createPaymentDto.paymentMethod.card.number,
        holder: createPaymentDto.paymentMethod.card.holderName,
        cvv: createPaymentDto.paymentMethod.card.cvv,
        expiration: createPaymentDto.paymentMethod.card.expirationDate,
        installmentNumber: createPaymentDto.paymentMethod.card.installments,
      },
    };

    const { data } = await lastValueFrom(
      this.httpService.post<Provider2CreatePaymentResponse>(
        apiUrl + '/transactions',
        provider2CreatePaymentDto,
        { timeout: 5000 },
      ),
    );

    return {
      id: data.id,
      createdDate: data.date,
      status: 'success',
      amount: data.amount,
      originalAmount: data.originalAmount,
      currency: data.currency,
      description: data.statementDescriptor,
      paymentMethod: 'card',
      cardId: data.cardId,
      provider: 'provider2',
    };
  }
}
