import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';

@Injectable()
export class CircuitBreakerService {
  public resetTimeout: number;

  constructor(private readonly configService: ConfigService) {
    this.resetTimeout = this.configService.get<number>(
      'circuitBreaker.resetTimeout',
    );
  }

  createCircuitBreaker<Input extends unknown[], Output>(
    requestFn: (...input: Input) => Promise<Output>,
  ): CircuitBreaker<Input, Output> {
    const options = {
      timeout: this.resetTimeout,
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
