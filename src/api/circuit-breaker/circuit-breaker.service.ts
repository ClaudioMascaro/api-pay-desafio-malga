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
      timeout: this.configService.get<number>('circuitBreaker.timeout'),
      errorThresholdPercentage: this.configService.get<number>(
        'circuitBreaker.errorThresholdPercentage',
      ),
      resetTimeout: this.resetTimeout,
    };

    const breaker = new CircuitBreaker(requestFn, options);

    breaker.on('open', () => {
      console.warn('Circuit open - blocking new calls.');
    });

    breaker.on('close', () => {
      console.info('Circuit closed - calls allowed.');
    });

    breaker.on('halfOpen', () => {
      console.info('Circuit in test - checking recovery.');
    });

    return breaker;
  }
}
