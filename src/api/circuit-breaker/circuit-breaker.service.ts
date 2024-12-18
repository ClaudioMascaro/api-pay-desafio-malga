import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';

@Injectable()
export class CircuitBreakerService {
  constructor(private readonly configService: ConfigService) {}

  createCircuitBreaker<Input extends unknown[], Output>(
    requestFn: (...input: Input) => Promise<Output>,
  ): CircuitBreaker<Input, Output> {
    const options = {
      timeout: this.configService.get<number>('circuitBreaker.timeout'),
      errorThresholdPercentage: this.configService.get<number>(
        'circuitBreaker.errorThresholdPercentage',
      ),
      resetTimeout: this.configService.get<number>(
        'circuitBreaker.resetTimeout',
      ),
    };

    const breaker = new CircuitBreaker(requestFn, options);

    breaker.on('open', () => {
      console.warn('Circuito aberto - bloqueando novas chamadas.');
    });

    breaker.on('close', () => {
      console.info('Circuito fechado - chamadas liberadas.');
    });

    breaker.on('halfOpen', () => {
      console.info('Circuito em teste - verificando recuperação.');
    });

    return breaker;
  }
}
