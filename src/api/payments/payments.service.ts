import { Injectable, Logger } from '@nestjs/common';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from './dto/create-payment.dto';
import { Provider1Strategy } from './providers/provider1.strategy';
import { Provider2Strategy } from './providers/provider2.strategy';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly provider1Strategy: Provider1Strategy,
    private readonly provider2Strategy: Provider2Strategy,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  async processPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse> {
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

    return this.processPayment(createPaymentDto);
  }
}
