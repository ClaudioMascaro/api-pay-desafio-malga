import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Provider1Strategy } from './provider1.strategy';
import { CircuitBreakerService } from '../../circuit-breaker/circuit-breaker.service';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from '../dto/create-payment.dto';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('Provider1Strategy', () => {
  let module: TestingModule;
  let provider1Strategy: Provider1Strategy;

  const mockCreatePaymentDto: CreatePaymentDto = {
    amount: 100,
    currency: 'USD',
    description: 'Test Payment',
    paymentMethod: {
      type: 'card',
      card: {
        number: '4111111111111111',
        holderName: 'John Doe',
        cvv: '123',
        expirationDate: '12/2025',
        installments: 1,
      },
    },
  };

  const mockApiResponse = {
    id: 'mock-id',
    createdAt: '2024-12-18',
    status: 'authorized',
    currentAmount: 100,
    originalAmount: 100,
    currency: 'USD',
    description: 'Test Payment',
    paymentMethod: 'card',
    cardId: 'mock-card-id',
  };

  const expectedResponse: CreatePaymentResponse = {
    id: 'mock-id',
    createdDate: '2024-12-18',
    status: 'success',
    amount: 100,
    originalAmount: 100,
    currency: 'USD',
    description: 'Test Payment',
    paymentMethod: 'card',
    cardId: 'mock-card-id',
    provider: 'provider1',
  };

  describe('When the payment is processed successfully', () => {
    const configService = {
      get: jest.fn().mockReturnValue('http://mock-provider1-api'),
    } as unknown as jest.Mocked<ConfigService>;

    const httpService = {
      post: jest.fn().mockReturnValue(
        of({
          data: mockApiResponse,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {},
        } as AxiosResponse),
      ),
    } as unknown as jest.Mocked<HttpService>;

    const circuitBreakerService = {
      createCircuitBreaker: jest.fn().mockImplementation((fn) => ({
        fire: jest.fn((args) => fn(args)),
        on: jest.fn(),
      })),
    } as unknown as jest.Mocked<CircuitBreakerService>;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          Provider1Strategy,
          { provide: ConfigService, useValue: configService },
          { provide: HttpService, useValue: httpService },
          { provide: CircuitBreakerService, useValue: circuitBreakerService },
        ],
      }).compile();

      provider1Strategy = module.get<Provider1Strategy>(Provider1Strategy);
    });

    it('should return the expected response', async () => {
      const result =
        await provider1Strategy.processPayment(mockCreatePaymentDto);

      expect(configService.get).toHaveBeenCalledWith(
        'payments.provider1.apiUrl',
      );
      expect(httpService.post).toHaveBeenCalledWith(
        'http://mock-provider1-api/charges',
        {
          amount: 100,
          currency: 'USD',
          description: 'Test Payment',
          paymentMethod: {
            type: 'card',
            card: {
              number: '4111111111111111',
              holderName: 'John Doe',
              cvv: '123',
              expirationDate: '12/2025',
              installments: 1,
            },
          },
        },
        { timeout: 1000 },
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('When the Circuit Breaker is open', () => {
    const configService = {
      get: jest.fn().mockReturnValue('http://mock-provider1-api'),
    } as unknown as jest.Mocked<ConfigService>;

    const httpService = {
      post: jest.fn(),
    } as unknown as jest.Mocked<HttpService>;

    const circuitBreakerService = {
      createCircuitBreaker: jest.fn().mockImplementation(() => ({
        fire: jest.fn().mockRejectedValue(new Error('Circuit Breaker Open')),
        on: jest.fn(),
      })),
    } as unknown as jest.Mocked<CircuitBreakerService>;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          Provider1Strategy,
          { provide: ConfigService, useValue: configService },
          { provide: HttpService, useValue: httpService },
          { provide: CircuitBreakerService, useValue: circuitBreakerService },
        ],
      }).compile();

      provider1Strategy = module.get<Provider1Strategy>(Provider1Strategy);
    });

    it('should throw an error indicating that the Circuit Breaker is open', async () => {
      await expect(
        provider1Strategy.processPayment(mockCreatePaymentDto),
      ).rejects.toThrow('Circuit Breaker Open');

      expect(httpService.post).not.toHaveBeenCalled();
    });
  });

  describe('When the request to the provider fails', () => {
    const configService = {
      get: jest.fn().mockReturnValue('http://mock-provider1-api'),
    } as unknown as jest.Mocked<ConfigService>;

    const httpService = {
      post: jest.fn().mockReturnValue(
        of({
          data: null,
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config: {},
        } as AxiosResponse),
      ),
    } as unknown as jest.Mocked<HttpService>;

    const circuitBreakerService = {
      createCircuitBreaker: jest.fn().mockImplementation((fn) => ({
        fire: jest.fn((args) => fn(args)),
        on: jest.fn(),
      })),
    } as unknown as jest.Mocked<CircuitBreakerService>;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          Provider1Strategy,
          { provide: ConfigService, useValue: configService },
          { provide: HttpService, useValue: httpService },
          { provide: CircuitBreakerService, useValue: circuitBreakerService },
        ],
      }).compile();

      provider1Strategy = module.get<Provider1Strategy>(Provider1Strategy);
    });

    it('should throw an error when processing the payment', async () => {
      await expect(
        provider1Strategy.processPayment(mockCreatePaymentDto),
      ).rejects.toThrow();

      expect(configService.get).toHaveBeenCalledWith(
        'payments.provider1.apiUrl',
      );
      expect(httpService.post).toHaveBeenCalledWith(
        'http://mock-provider1-api/charges',
        {
          amount: 100,
          currency: 'USD',
          description: 'Test Payment',
          paymentMethod: {
            type: 'card',
            card: {
              number: '4111111111111111',
              holderName: 'John Doe',
              cvv: '123',
              expirationDate: '12/2025',
              installments: 1,
            },
          },
        },
        { timeout: 1000 },
      );
    });
  });
});
