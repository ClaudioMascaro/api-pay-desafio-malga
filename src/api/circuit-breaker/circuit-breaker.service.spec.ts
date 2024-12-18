import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import CircuitBreaker from 'opossum';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let circuitBreakerService: CircuitBreakerService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => {
        const configMap = {
          'circuitBreaker.timeout': 5000,
          'circuitBreaker.errorThresholdPercentage': 50,
          'circuitBreaker.resetTimeout': 10000,
        };
        return configMap[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    circuitBreakerService = module.get<CircuitBreakerService>(
      CircuitBreakerService,
    );
  });

  it('should create a CircuitBreaker with the correct options', () => {
    const requestFn = jest.fn();
    const breaker = circuitBreakerService.createCircuitBreaker(requestFn);

    expect(configService.get).toHaveBeenCalledWith('circuitBreaker.timeout');
    expect(configService.get).toHaveBeenCalledWith(
      'circuitBreaker.errorThresholdPercentage',
    );
    expect(configService.get).toHaveBeenCalledWith(
      'circuitBreaker.resetTimeout',
    );

    expect(typeof breaker).toBe('object');
    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it('should register "open", "close" and "halfOpen" events', () => {
    const requestFn = jest.fn();
    const breaker = circuitBreakerService.createCircuitBreaker(requestFn);

    const openListener = jest.spyOn(console, 'warn').mockImplementation();
    const closeListener = jest.spyOn(console, 'info').mockImplementation();
    const halfOpenListener = jest.spyOn(console, 'info').mockImplementation();

    breaker.emit('open');
    breaker.emit('close');
    breaker.emit('halfOpen');

    expect(openListener).toHaveBeenCalledWith(
      'Circuit open - blocking new calls.',
    );
    expect(closeListener).toHaveBeenCalledWith(
      'Circuit closed - calls allowed.',
    );
    expect(halfOpenListener).toHaveBeenCalledWith(
      'Circuit in test - checking recovery.',
    );

    openListener.mockRestore();
    closeListener.mockRestore();
    halfOpenListener.mockRestore();
  });

  it('should return a functional CircuitBreaker', async () => {
    const requestFn = jest.fn().mockResolvedValue('success');
    const breaker = circuitBreakerService.createCircuitBreaker(requestFn);

    const result = await breaker.fire();
    expect(requestFn).toHaveBeenCalled();
    expect(result).toBe('success');
  });

  it('should handle failures in the request function', async () => {
    const requestFn = jest.fn().mockRejectedValue(new Error('Request failed'));
    const breaker = circuitBreakerService.createCircuitBreaker(requestFn);

    await expect(breaker.fire()).rejects.toThrow('Request failed');
    expect(requestFn).toHaveBeenCalled();
  });
});
