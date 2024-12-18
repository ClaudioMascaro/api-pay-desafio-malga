import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { Provider1Strategy } from './providers/provider1.strategy';
import { Provider2Strategy } from './providers/provider2.strategy';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import { CreatePaymentDto, PaymentResponse } from './dto/payments.dto';
import { ConfigService } from '@nestjs/config';

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let provider1Strategy: jest.Mocked<Provider1Strategy>;
  let provider2Strategy: jest.Mocked<Provider2Strategy>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;
  let configService: jest.Mocked<ConfigService>;

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

  const mockCreatePaymentResponse: PaymentResponse = {
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
    configService = {
      get: jest.fn().mockReturnValue(3),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: Provider1Strategy,
          useValue: {
            processPayment: jest.fn(),
          },
        },
        {
          provide: Provider2Strategy,
          useValue: {
            processPayment: jest.fn(),
          },
        },
        {
          provide: CircuitBreakerService,
          useValue: {
            resetTimeout: 1000,
          },
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    provider1Strategy = module.get(Provider1Strategy);
    provider2Strategy = module.get(Provider2Strategy);
    circuitBreakerService = module.get(CircuitBreakerService);
  });

  describe('processPayment', () => {
    it('should process the payment with Provider1Strategy successfully', async () => {
      provider1Strategy.processPayment.mockResolvedValue(
        mockCreatePaymentResponse,
      );

      const result = await paymentsService.processPayment(mockCreatePaymentDto);

      expect(provider1Strategy.processPayment).toHaveBeenCalledWith(
        mockCreatePaymentDto,
      );
      expect(result).toEqual(mockCreatePaymentResponse);
    });

    it('should try Provider2Strategy if Provider1Strategy fails', async () => {
      provider1Strategy.processPayment.mockRejectedValue(
        new Error('Provider1 error'),
      );
      provider2Strategy.processPayment.mockResolvedValue(
        mockCreatePaymentResponse,
      );

      const result = await paymentsService.processPayment(mockCreatePaymentDto);

      expect(provider1Strategy.processPayment).toHaveBeenCalledWith(
        mockCreatePaymentDto,
      );
      expect(provider2Strategy.processPayment).toHaveBeenCalledWith(
        mockCreatePaymentDto,
      );
      expect(result).toEqual(mockCreatePaymentResponse);
    });

    it('should retry the function if both providers fail', async () => {
      provider1Strategy.processPayment.mockRejectedValue(
        new Error('Provider1 error'),
      );
      provider2Strategy.processPayment.mockRejectedValue(
        new Error('Provider2 error'),
      );

      const retrySpy = jest.spyOn(paymentsService, 'processPayment');

      setTimeout(() => {
        provider1Strategy.processPayment.mockResolvedValue(
          mockCreatePaymentResponse,
        );
      }, circuitBreakerService.resetTimeout);

      const result = await paymentsService.processPayment(mockCreatePaymentDto);

      expect(provider1Strategy.processPayment).toHaveBeenCalledTimes(2);
      expect(provider2Strategy.processPayment).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCreatePaymentResponse);
      expect(retrySpy).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if the maximum number of retries is exceeded', async () => {
      provider1Strategy.processPayment.mockRejectedValue(
        new Error('Provider1 error'),
      );
      provider2Strategy.processPayment.mockRejectedValue(
        new Error('Provider2 error'),
      );

      await expect(
        paymentsService.processPayment(mockCreatePaymentDto),
      ).rejects.toThrow('Max retries exceeded, all payment providers failed');

      expect(provider1Strategy.processPayment).toHaveBeenCalledTimes(4);
      expect(provider2Strategy.processPayment).toHaveBeenCalledTimes(4);
    });
  });

  describe('findPaymentById', () => {
    it('should find payment with Provider1Strategy successfully', async () => {
      const mockPaymentResponse: PaymentResponse = {
        ...mockCreatePaymentResponse,
      };

      provider1Strategy.findPaymentById = jest
        .fn()
        .mockResolvedValue(mockPaymentResponse);

      const result = await paymentsService.findPaymentById('mock-id');

      expect(provider1Strategy.findPaymentById).toHaveBeenCalledWith('mock-id');
      expect(result).toEqual(mockPaymentResponse);
    });

    it('should try Provider2Strategy if Provider1Strategy fails for findPaymentById', async () => {
      const mockPaymentResponse: PaymentResponse = {
        ...mockCreatePaymentResponse,
      };

      provider1Strategy.findPaymentById = jest
        .fn()
        .mockRejectedValue(new Error('Provider1 error'));
      provider2Strategy.findPaymentById = jest
        .fn()
        .mockResolvedValue(mockPaymentResponse);

      const result = await paymentsService.findPaymentById('mock-id');

      expect(provider1Strategy.findPaymentById).toHaveBeenCalledWith('mock-id');
      expect(provider2Strategy.findPaymentById).toHaveBeenCalledWith('mock-id');
      expect(result).toEqual(mockPaymentResponse);
    });

    it('should throw NotFoundException if no providers find the payment', async () => {
      provider1Strategy.findPaymentById = jest
        .fn()
        .mockRejectedValue({ status: 404 });
      provider2Strategy.findPaymentById = jest
        .fn()
        .mockRejectedValue({ status: 404 });

      await expect(paymentsService.findPaymentById('mock-id')).rejects.toThrow(
        'Payment not found',
      );

      expect(provider1Strategy.findPaymentById).toHaveBeenCalledWith('mock-id');
      expect(provider2Strategy.findPaymentById).toHaveBeenCalledWith('mock-id');
    });

    it('should throw BadGatewayException if all providers fail with other errors', async () => {
      provider1Strategy.findPaymentById = jest
        .fn()
        .mockRejectedValue(new Error('Provider1 error'));
      provider2Strategy.findPaymentById = jest
        .fn()
        .mockRejectedValue(new Error('Provider2 error'));

      await expect(paymentsService.findPaymentById('mock-id')).rejects.toThrow(
        'All payment providers failed',
      );

      expect(provider1Strategy.findPaymentById).toHaveBeenCalledWith('mock-id');
      expect(provider2Strategy.findPaymentById).toHaveBeenCalledWith('mock-id');
    });
  });

  describe('refundPayment', () => {
    it('should refund payment with Provider1Strategy successfully', async () => {
      const mockRefundDto = { amount: 100 };
      const mockRefundResponse: PaymentResponse = {
        ...mockCreatePaymentResponse,
      };

      provider1Strategy.refundPayment = jest
        .fn()
        .mockResolvedValue(mockRefundResponse);

      const result = await paymentsService.refundPayment(
        'mock-id',
        mockRefundDto,
      );

      expect(provider1Strategy.refundPayment).toHaveBeenCalledWith(
        'mock-id',
        mockRefundDto,
      );
      expect(result).toEqual(mockRefundResponse);
    });

    it('should try Provider2Strategy if Provider1Strategy fails for refundPayment', async () => {
      const mockRefundDto = { amount: 100 };
      const mockRefundResponse: PaymentResponse = {
        ...mockCreatePaymentResponse,
      };

      provider1Strategy.refundPayment = jest
        .fn()
        .mockRejectedValue(new Error('Provider1 error'));
      provider2Strategy.refundPayment = jest
        .fn()
        .mockResolvedValue(mockRefundResponse);

      const result = await paymentsService.refundPayment(
        'mock-id',
        mockRefundDto,
      );

      expect(provider1Strategy.refundPayment).toHaveBeenCalledWith(
        'mock-id',
        mockRefundDto,
      );
      expect(provider2Strategy.refundPayment).toHaveBeenCalledWith(
        'mock-id',
        mockRefundDto,
      );
      expect(result).toEqual(mockRefundResponse);
    });

    it('should throw NotFoundException if no providers refund the payment', async () => {
      const mockRefundDto = { amount: 100 };

      provider1Strategy.refundPayment = jest
        .fn()
        .mockRejectedValue({ status: 404 });
      provider2Strategy.refundPayment = jest
        .fn()
        .mockRejectedValue({ status: 404 });

      await expect(
        paymentsService.refundPayment('mock-id', mockRefundDto),
      ).rejects.toThrow('Payment not found');

      expect(provider1Strategy.refundPayment).toHaveBeenCalledWith(
        'mock-id',
        mockRefundDto,
      );
      expect(provider2Strategy.refundPayment).toHaveBeenCalledWith(
        'mock-id',
        mockRefundDto,
      );
    });

    it('should throw BadRequestException if any provider throws a 400 error', async () => {
      const mockRefundDto = { amount: 100 };
      const mockError = { status: 400, response: { data: 'Invalid request' } };

      provider1Strategy.refundPayment = jest.fn().mockRejectedValue(mockError);
      provider2Strategy.refundPayment = jest.fn().mockRejectedValue(mockError);

      await expect(
        paymentsService.refundPayment('mock-id', mockRefundDto),
      ).rejects.toEqual(mockError);

      expect(provider1Strategy.refundPayment).toHaveBeenCalledWith(
        'mock-id',
        mockRefundDto,
      );
      expect(provider2Strategy.refundPayment).not.toHaveBeenCalled();
    });

    it('should throw BadGatewayException if all providers fail with server errors', async () => {
      const mockRefundDto = { amount: 100 };

      provider1Strategy.refundPayment = jest
        .fn()
        .mockRejectedValue({ status: 500 });
      provider2Strategy.refundPayment = jest
        .fn()
        .mockRejectedValue({ status: 500 });

      await expect(
        paymentsService.refundPayment('mock-id', mockRefundDto),
      ).rejects.toThrow('All payment providers failed');

      expect(provider1Strategy.refundPayment).toHaveBeenCalledWith(
        'mock-id',
        mockRefundDto,
      );
      expect(provider2Strategy.refundPayment).toHaveBeenCalledWith(
        'mock-id',
        mockRefundDto,
      );
    });
  });
});
