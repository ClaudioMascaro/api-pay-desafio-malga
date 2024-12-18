import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateChargeDto,
  ChargeResponse,
  RefundChargeDto,
} from './dto/charges.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class Provider1Service {
  private charges: ChargeResponse[] = [];

  async createCharge(
    createChargeDto: CreateChargeDto,
  ): Promise<ChargeResponse> {
    const timeout =
      Math.random() < 0.1 ? 1200 : Math.floor(Math.random() * 500);
    await new Promise((resolve) => setTimeout(resolve, timeout));

    if (Math.random() < 0.01) {
      throw new InternalServerErrorException();
    }
    if (createChargeDto.amount === 777) {
      const response: ChargeResponse = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        status: 'failed',
        originalAmount: createChargeDto.amount,
        currentAmount: createChargeDto.amount,
        currency: createChargeDto.currency,
        description: createChargeDto.description,
        paymentMethod: 'card',
        cardId: randomUUID(),
      };

      this.charges.push(response);

      return response;
    }

    const response: ChargeResponse = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'authorized',
      originalAmount: createChargeDto.amount,
      currentAmount: createChargeDto.amount,
      currency: createChargeDto.currency,
      description: createChargeDto.description,
      paymentMethod: 'card',
      cardId: randomUUID(),
    };

    this.charges.push(response);

    return response;
  }

  async getCharge(id: string): Promise<ChargeResponse> {
    const charge = this.charges.find((c) => c.id === id);
    if (!charge) {
      throw new NotFoundException('Charge not found.');
    }

    return charge;
  }

  async refundCharge(
    chargeId: string,
    { amount }: RefundChargeDto,
  ): Promise<ChargeResponse> {
    const charge = this.charges.find((c) => c.id === chargeId);
    if (!charge) {
      throw new NotFoundException('Charge not found.');
    }

    if (charge.status !== 'authorized') {
      throw new BadRequestException('Charge cannot be refunded.');
    }

    if (amount > charge.currentAmount) {
      throw new BadRequestException(
        'Refund amount is greater than the charge.',
      );
    }

    const response: ChargeResponse = {
      id: charge.id,
      createdAt: charge.createdAt,
      status: 'refunded',
      originalAmount: charge.originalAmount,
      currentAmount: amount,
      currency: charge.currency,
      description: charge.description,
      paymentMethod: charge.paymentMethod,
      cardId: charge.cardId,
    };

    this.updateCharge(response);

    return response;
  }

  private async updateCharge(charge: ChargeResponse) {
    const index = this.charges.findIndex((c) => c.id === charge.id);
    this.charges[index] = charge;
  }
}
