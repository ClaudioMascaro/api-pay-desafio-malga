import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { Provider1Strategy } from './providers/provider1.strategy';
import { Provider2Strategy } from './providers/provider2.strategy';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from './dto/create-payment.dto';

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let provider1Strategy: jest.Mocked<Provider1Strategy>;
  let provider2Strategy: jest.Mocked<Provider2Strategy>;
  let circuitBreakerService: jest.Mocked<CircuitBreakerService>;

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

  const mockCreatePaymentResponse: CreatePaymentResponse = {
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

  beforeEach(async () => {
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
      ],
    }).compile();

    paymentsService = module.get<PaymentsService>(PaymentsService);
    provider1Strategy = module.get(Provider1Strategy);
    provider2Strategy = module.get(Provider2Strategy);
    circuitBreakerService = module.get(CircuitBreakerService);
  });

  it('deve processar o pagamento com o Provider1Strategy com sucesso', async () => {
    provider1Strategy.processPayment.mockResolvedValue(
      mockCreatePaymentResponse,
    );

    const result = await paymentsService.processPayment(mockCreatePaymentDto);

    expect(provider1Strategy.processPayment).toHaveBeenCalledWith(
      mockCreatePaymentDto,
    );
    expect(result).toEqual(mockCreatePaymentResponse);
  });

  it('deve tentar o Provider2Strategy se o Provider1Strategy falhar', async () => {
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

  it('deve reexecutar a função se ambos os provedores falharem', async () => {
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
});
