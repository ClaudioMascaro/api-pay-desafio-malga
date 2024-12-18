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
        this.logger.log(`Tentando processar pagamento com ${name}`);
        return await strategy.processPayment(createPaymentDto);
      } catch (error) {
        this.logger.warn(`Falha ao processar com ${name}: ${error.message}`);
        continue; // Tenta o próximo provedor
      }
    }

    this.logger.error(
      'Todos os provedores falharam, retentando após o circuit breaker reset',
    );

    await new Promise((resolve) =>
      setTimeout(resolve, this.circuitBreakerService.resetTimeout),
    );

    return this.processPayment(createPaymentDto);
  }
}
