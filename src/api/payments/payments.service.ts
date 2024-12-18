import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from './dto/create-payment.dto';
import PaymentProviderStrategy from './providers/payment-provider.interface';
import { Provider1Strategy } from './providers/provider1.strategy';
import { Provider2Strategy } from './providers/provider2.strategy';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly provider1Strategy: Provider1Strategy,
    private readonly provider2Strategy: Provider2Strategy,
  ) {}

  async processPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse> {
    const strategies: { name: string; strategy: PaymentProviderStrategy }[] = [
      { name: 'Provider1', strategy: this.provider1Strategy },
      { name: 'Provider2', strategy: this.provider2Strategy },
    ];

    const circuitBreaker = this.circuitBreakerService.createCircuitBreaker<
      [PaymentProviderStrategy],
      CreatePaymentResponse
    >(async (strategy: PaymentProviderStrategy) => {
      return await strategy.processPayment(createPaymentDto);
    });

    for (const { name, strategy } of strategies) {
      try {
        this.logger.log(`Tentando processar pagamento com ${name}`);
        const response = await circuitBreaker.fire(strategy);
        return response;
      } catch (error) {
        this.logger.warn(`Falha ao processar com ${name}: ${error.message}`);
        continue;
      }
    }

    this.logger.error('Todos os provedores falharam.');
    throw new Error('Não foi possível processar o pagamento.');
  }
}
