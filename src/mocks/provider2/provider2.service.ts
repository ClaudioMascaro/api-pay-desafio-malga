import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from './dto/create-payment.dto';

@Injectable()
export class Provider2Service {
  private payments: CreatePaymentResponse[] = [];

  processPayment(createPaymentDto: CreatePaymentDto): CreatePaymentResponse {
    if (Math.random() < 0.2) {
      throw new InternalServerErrorException('Provider 1 indisponível.');
    }
    if (createPaymentDto.amount === 777) {
      const response: CreatePaymentResponse = {
        id: randomUUID(),
        date: new Date().toISOString(),
        status: 'failed',
        amount: createPaymentDto.amount,
        originalAmount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        statementDescriptor: createPaymentDto.statementDescriptor,
        paymentType: 'card',
        cardId: randomUUID(),
      };

      this.payments.push(response);

      return response;
    }

    const response: CreatePaymentResponse = {
      id: randomUUID(),
      date: new Date().toISOString(),
      status: 'paid',
      amount: createPaymentDto.amount,
      originalAmount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      statementDescriptor: createPaymentDto.statementDescriptor,
      paymentType: 'card',
      cardId: randomUUID(),
    };

    this.payments.push(response);

    return response;
  }
}
