import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CreateTransactionDto,
  TransactionResponse,
  RefundTransactionDto,
} from './dto/transactions.dto';

@Injectable()
export class Provider2Service {
  private transactions: TransactionResponse[] = [];

  async createTransaction(
    createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionResponse> {
    const timeout =
      Math.random() < 0.05 ? 1200 : Math.floor(Math.random() * 500);
    await new Promise((resolve) => setTimeout(resolve, timeout));

    if (Math.random() < 0.005) {
      throw new InternalServerErrorException();
    }
    if (createTransactionDto.amount === 777) {
      const response: TransactionResponse = {
        id: randomUUID(),
        date: new Date().toISOString(),
        status: 'failed',
        amount: createTransactionDto.amount,
        originalAmount: createTransactionDto.amount,
        currency: createTransactionDto.currency,
        statementDescriptor: createTransactionDto.statementDescriptor,
        paymentType: 'card',
        cardId: randomUUID(),
      };

      this.transactions.push(response);

      return response;
    }

    const response: TransactionResponse = {
      id: randomUUID(),
      date: new Date().toISOString(),
      status: 'paid',
      amount: createTransactionDto.amount,
      originalAmount: createTransactionDto.amount,
      currency: createTransactionDto.currency,
      statementDescriptor: createTransactionDto.statementDescriptor,
      paymentType: 'card',
      cardId: randomUUID(),
    };

    this.transactions.push(response);

    return response;
  }

  async getTransaction(id: string): Promise<TransactionResponse> {
    const transaction = this.transactions.find((t) => t.id === id);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async refundTransaction(
    transactionId: string,
    { amount }: RefundTransactionDto,
  ): Promise<TransactionResponse> {
    const transaction = this.transactions.find((t) => t.id === transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }

    if (transaction.status !== 'paid') {
      throw new BadRequestException('Transaction cannot be voided.');
    }

    if (amount > transaction.amount) {
      throw new BadRequestException(
        'Void amount is higher than transaction amount.',
      );
    }

    const refund: TransactionResponse = {
      id: transaction.id,
      date: transaction.date,
      status: 'voided',
      amount: amount,
      originalAmount: transaction.originalAmount,
      currency: transaction.currency,
      statementDescriptor: transaction.statementDescriptor,
      paymentType: transaction.paymentType,
      cardId: transaction.cardId,
    };

    this.updateTransaction(refund);

    return refund;
  }

  private async updateTransaction(transaction: TransactionResponse) {
    const index = this.transactions.findIndex((t) => t.id === transaction.id);
    this.transactions[index] = transaction;
  }
}
