import { Injectable } from '@nestjs/common';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from './dto/create-payment.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class Provider1Service {
  private payments: CreatePaymentResponse[] = [];

  async processPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse> {
    const timeout =
      Math.random() < 0.1 ? 1200 : Math.floor(Math.random() * 500);
    await new Promise((resolve) => setTimeout(resolve, timeout));

    if (Math.random() < 0.01) {
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
      id: randomUUID(),
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
