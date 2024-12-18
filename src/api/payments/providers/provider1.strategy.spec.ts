import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Provider1Strategy } from './provider1.strategy';
import { CircuitBreakerService } from '../../circuit-breaker/circuit-breaker.service';
import {
  CreatePaymentDto,
  PaymentResponse,
  RefundPaymentDto,
} from '../dto/payments.dto';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { BadRequestException } from '@nestjs/common';

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

  const mockRefundDto: RefundPaymentDto = { amount: 50 };

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

  const expectedResponse: PaymentResponse = {
    id: 'mock-id',
    createdDate: '2024-12-18',
    status: 'success',
    amount: 100,
    originalAmount: 100,
    currency: 'USD',
    description: 'Test Payment',
    paymentMethod: 'card',
    cardId: 'mock-card-id',
  };

  describe('processPayment', () => {
    describe('When the payment is processed successfully', () => {
      const configService = {
        get: jest.fn((key: string) => {
          const configMap = {
            'payments.provider1.apiUrl': 'http://mock-provider1-api',
            'payments.requestTimeout': 1000,
          };
          return configMap[key];
        }),
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
        expect(configService.get).toHaveBeenCalledWith(
          'payments.requestTimeout',
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
        get: jest.fn((key: string) => {
          const configMap = {
            'payments.provider1.apiUrl': 'http://mock-provider1-api',
            'payments.requestTimeout': 1000,
          };
          return configMap[key];
        }),
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
        get: jest.fn((key: string) => {
          const configMap = {
            'payments.provider1.apiUrl': 'http://mock-provider1-api',
            'payments.requestTimeout': 1000,
          };
          return configMap[key];
        }),
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
        expect(configService.get).toHaveBeenCalledWith(
          'payments.requestTimeout',
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

  describe('findPaymentById', () => {
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

    const expectedResponse: PaymentResponse = {
      id: 'mock-id',
      createdDate: '2024-12-18',
      status: 'success',
      amount: 100,
      originalAmount: 100,
      currency: 'USD',
      description: 'Test Payment',
      paymentMethod: 'card',
      cardId: 'mock-card-id',
    };

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          Provider1Strategy,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const configMap = {
                  'payments.provider1.apiUrl': 'http://mock-provider1-api',
                  'payments.requestTimeout': 1000,
                };
                return configMap[key];
              }),
            },
          },
          {
            provide: HttpService,
            useValue: {
              get: jest.fn().mockReturnValue(
                of({
                  data: mockApiResponse,
                  status: 200,
                } as AxiosResponse),
              ),
            },
          },
          {
            provide: CircuitBreakerService,
            useValue: {
              createCircuitBreaker: jest.fn(),
            },
          },
        ],
      }).compile();

      provider1Strategy = module.get<Provider1Strategy>(Provider1Strategy);
    });

    it('should return the payment details successfully', async () => {
      const result = await provider1Strategy.findPaymentById('mock-id');

      expect(result).toEqual(expectedResponse);
    });

    it('should throw an error when the provider returns a 404', async () => {
      const httpService = module.get<HttpService>(HttpService);
      jest.spyOn(httpService, 'get').mockReturnValueOnce(
        of({
          status: 404,
          statusText: 'Not Found',
          data: null,
        } as AxiosResponse),
      );

      await expect(
        provider1Strategy.findPaymentById('invalid-id'),
      ).rejects.toThrow();
    });
  });

  describe('refundPayment', () => {
    const mockRefundDto = { amount: 50 };
    const mockApiResponse = {
      id: 'mock-id',
      createdAt: '2024-12-18',
      status: 'refunded',
      currentAmount: 50,
      originalAmount: 100,
      currency: 'USD',
      description: 'Test Refund',
      paymentMethod: 'card',
      cardId: 'mock-card-id',
    };

    const expectedResponse: PaymentResponse = {
      id: 'mock-id',
      createdDate: '2024-12-18',
      status: 'refunded',
      amount: 50,
      originalAmount: 100,
      currency: 'USD',
      description: 'Test Refund',
      paymentMethod: 'card',
      cardId: 'mock-card-id',
    };

    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          Provider1Strategy,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                const configMap = {
                  'payments.provider1.apiUrl': 'http://mock-provider1-api',
                  'payments.requestTimeout': 1000,
                };
                return configMap[key];
              }),
            },
          },
          {
            provide: HttpService,
            useValue: {
              post: jest.fn().mockReturnValue(
                of({
                  data: mockApiResponse,
                  status: 200,
                } as AxiosResponse),
              ),
            },
          },
          {
            provide: CircuitBreakerService,
            useValue: {
              createCircuitBreaker: jest.fn(),
            },
          },
        ],
      }).compile();

      provider1Strategy = module.get<Provider1Strategy>(Provider1Strategy);
    });

    it('should refund the payment successfully', async () => {
      const result = await provider1Strategy.refundPayment(
        'mock-id',
        mockRefundDto,
      );

      expect(result).toEqual(expectedResponse);
    });

    it('should throw an error if the refund fails', async () => {
      const httpService = module.get<HttpService>(HttpService);
      jest.spyOn(httpService, 'post').mockReturnValueOnce(
        of({
          status: 500,
          statusText: 'Internal Server Error',
          data: null,
        } as AxiosResponse),
      );

      await expect(
        provider1Strategy.refundPayment('mock-id', mockRefundDto),
      ).rejects.toThrow();
    });

    it('should throw a BadRequestException if the refund amount is greater than the charge', async () => {
      const httpService = module.get<HttpService>(HttpService);
      const mockError = {
        status: 400,
        response: {
          data: { message: 'Refund amount is greater than the charge.' },
        },
      } as AxiosError;

      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(throwError(() => mockError));

      await expect(
        provider1Strategy.refundPayment('mock-id', mockRefundDto),
      ).rejects.toEqual(
        new BadRequestException('Refund amount is greater than payment amount'),
      );

      expect(httpService.post).toHaveBeenCalledWith(
        'http://mock-provider1-api/refund/mock-id',
        { amount: 50 },
        { timeout: 1000 },
      );
    });

    it('should throw a BadRequestException if the charge cannot be refunded', async () => {
      const httpService = module.get<HttpService>(HttpService);
      const mockError = {
        status: 400,
        response: {
          data: { message: 'Charge cannot be refunded' },
        },
      } as AxiosError;

      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(throwError(() => mockError));

      await expect(
        provider1Strategy.refundPayment('mock-id', mockRefundDto),
      ).rejects.toThrow(new BadRequestException('Payment cannot be refunded'));

      expect(httpService.post).toHaveBeenCalledWith(
        'http://mock-provider1-api/refund/mock-id',
        { amount: 50 },
        { timeout: 1000 },
      );
    });

    it('should throw an error if the provider returns a 404', async () => {
      const httpService = module.get<HttpService>(HttpService);

      const mockError = {
        status: 404,
        response: {
          data: { message: 'Charge not found' },
        },
      } as AxiosError;

      jest
        .spyOn(httpService, 'post')
        .mockReturnValueOnce(throwError(() => mockError));

      await expect(
        provider1Strategy.refundPayment('mock-id', mockRefundDto),
      ).rejects.toEqual(mockError);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://mock-provider1-api/refund/mock-id',
        { amount: 50 },
        { timeout: 1000 },
      );
    });
  });
});
