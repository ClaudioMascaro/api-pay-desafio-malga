import { Injectable } from '@nestjs/common';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from './dto/create-payment.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class Provider1Service {
  private payments: CreatePaymentResponse[] = [];

  processPayment(createPaymentDto: CreatePaymentDto): CreatePaymentResponse {
    if (Math.random() < 0.2) {
      throw new Error('Provider 1 indisponível.');
    }
    if (createPaymentDto.amount === 777) {
      const response: CreatePaymentResponse = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        status: 'failed',
        originalAmount: createPaymentDto.amount,
        currentAmount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        description: createPaymentDto.description,
        paymentMethod: 'card',
        cardId: randomUUID(),
      };

      this.payments.push(response);

      return response;
    }

    const response: CreatePaymentResponse = {
      id: 'uuid',
      createdAt: new Date().toISOString(),
      status: 'authorized',
      originalAmount: createPaymentDto.amount,
      currentAmount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      description: createPaymentDto.description,
      paymentMethod: 'card',
      cardId: randomUUID(),
    };

    this.payments.push(response);

    return response;
  }
}
