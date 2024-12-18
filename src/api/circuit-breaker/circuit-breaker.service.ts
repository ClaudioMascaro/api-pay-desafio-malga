import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
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
      this.logger.warn('Circuit open - calls are blocked.');
    });

    breaker.on('close', () => {
      this.logger.log('Circuit closed - calls are allowed.');
    });

    breaker.on('halfOpen', () => {
      this.logger.log('Circuit half-open - testing if calls are allowed.');
    });

    return breaker;
  }
}
