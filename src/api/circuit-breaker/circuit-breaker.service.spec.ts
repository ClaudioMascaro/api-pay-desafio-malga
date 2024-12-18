import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CircuitBreakerService } from './circuit-breaker.service';
import CircuitBreaker from 'opossum';

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

    expect(breaker).toBeInstanceOf(CircuitBreaker);
  });

  it('should register "open", "close", and "halfOpen" events with logger', () => {
    const requestFn = jest.fn();
    const breaker = circuitBreakerService.createCircuitBreaker(requestFn);

    const warnSpy = jest.spyOn(circuitBreakerService['logger'], 'warn');
    const logSpy = jest.spyOn(circuitBreakerService['logger'], 'log');

    breaker.emit('open');
    breaker.emit('close');
    breaker.emit('halfOpen');

    expect(warnSpy).toHaveBeenCalledWith('Circuit open - calls are blocked.');
    expect(logSpy).toHaveBeenCalledWith('Circuit closed - calls are allowed.');
    expect(logSpy).toHaveBeenCalledWith(
      'Circuit half-open - testing if calls are allowed.',
    );

    warnSpy.mockRestore();
    logSpy.mockRestore();
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
