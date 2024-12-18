import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreatePaymentDto,
  PaymentResponse,
  RefundPaymentDto,
} from './dto/payments.dto';
import { Provider1Strategy } from './providers/provider1.strategy';
import { Provider2Strategy } from './providers/provider2.strategy';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly provider1Strategy: Provider1Strategy,
    private readonly provider2Strategy: Provider2Strategy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  async processPayment(
    createPaymentDto: CreatePaymentDto,
    retries = 0,
  ): Promise<PaymentResponse> {
    const strategies = [
      { name: 'Provider1', strategy: this.provider1Strategy },
      { name: 'Provider2', strategy: this.provider2Strategy },
    ];

    for (const { name, strategy } of strategies) {
      try {
        this.logger.log(`trying to process with ${name}`);
        return await strategy.processPayment(createPaymentDto);
      } catch (error) {
        this.logger.warn(`${name} failed: ${error.message}`);
        continue;
      }
    }

    this.logger.error(
      'All payment providers failed. Retrying after reset timeout',
    );

    await new Promise((resolve) =>
      setTimeout(resolve, this.circuitBreakerService.resetTimeout),
    );

    if (retries < this.configService.get('payments.maxRetries')) {
      return this.processPayment(createPaymentDto, retries + 1);
    }

    throw new Error('Max retries exceeded, all payment providers failed');
  }

  async findPaymentById(id: string): Promise<PaymentResponse> {
    const strategies = [
      { name: 'Provider1', strategy: this.provider1Strategy },
      { name: 'Provider2', strategy: this.provider2Strategy },
    ];

    let lastError: AxiosError;
    for (const { name, strategy } of strategies) {
      try {
        this.logger.log(`trying to find payment with ${name}`);
        const payment = await strategy.findPaymentById(id);

        if (payment) {
          return payment;
        }
      } catch (error) {
        this.logger.warn(`${name} failed: ${error.message}`);
        lastError = error;
        continue;
      }
    }

    if (lastError.status === 404) {
      throw new NotFoundException('Payment not found');
    }

    throw new BadGatewayException('All payment providers failed');
  }

  async refundPayment(
    id: string,
    refundPaymentDto: RefundPaymentDto,
  ): Promise<PaymentResponse> {
    const strategies = [
      { name: 'Provider1', strategy: this.provider1Strategy },
      { name: 'Provider2', strategy: this.provider2Strategy },
    ];

    let lastError: AxiosError;
    for (const { name, strategy } of strategies) {
      try {
        this.logger.log(`trying to refund payment with ${name}`);
        const payment = await strategy.refundPayment(id, refundPaymentDto);

        if (payment) {
          return payment;
        }
      } catch (error) {
        this.logger.warn(`${name} failed: ${error.message}`);
        lastError = error;

        if (error.status === 400) {
          throw error;
        }

        continue;
      }
    }

    if (lastError.status === 404) {
      throw new NotFoundException('Payment not found');
    }

    if (lastError.status >= 500) {
      throw new BadGatewayException('All payment providers failed');
    }
  }
}
