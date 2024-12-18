import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  PaymentResponse,
  RefundPaymentDto,
} from './dto/payments.dto';

describe('PaymentsController', () => {
  let paymentsController: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    const mockPaymentsService = {
      processPayment: jest.fn(),
      refundPayment: jest.fn(),
      findPaymentById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: mockPaymentsService,
        },
      ],
    }).compile();

    paymentsController = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
  });

  describe('processPayment', () => {
    it('should call processPayment and return the result', async () => {
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
      const mockResult: PaymentResponse = {
        id: 'payment-id',
        createdDate: '2021-09-01T00:00:00.000Z',
        originalAmount: 100,
        amount: 100,
        currency: 'USD',
        description: 'Test Payment',
        status: 'success',
        paymentMethod: 'card',
        cardId: 'card-id',
      };

      paymentsService.processPayment.mockResolvedValue(mockResult);

      const result =
        await paymentsController.processPayment(mockCreatePaymentDto);

      expect(paymentsService.processPayment).toHaveBeenCalledWith(
        mockCreatePaymentDto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw an error if processPayment fails', async () => {
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

      paymentsService.processPayment.mockRejectedValue(
        new Error('Payment processing failed'),
      );

      await expect(
        paymentsController.processPayment(mockCreatePaymentDto),
      ).rejects.toThrow('Payment processing failed');
    });
  });

  describe('refundPayment', () => {
    it('should call refundPayment and return the result', async () => {
      const mockRefundPaymentDto: RefundPaymentDto = { amount: 50 };
      const mockId = 'refund-id';
      const mockResult: PaymentResponse = {
        id: 'refund-id',
        createdDate: '2021-09-01T00:00:00.000Z',
        originalAmount: 50,
        amount: 50,
        currency: 'USD',
        description: 'Refund Payment',
        status: 'refunded',
        paymentMethod: 'card',
        cardId: 'card-id',
      };

      paymentsService.refundPayment.mockResolvedValue(mockResult);

      const result = await paymentsController.refundPayment(
        mockRefundPaymentDto,
        mockId,
      );

      expect(paymentsService.refundPayment).toHaveBeenCalledWith(
        mockId,
        mockRefundPaymentDto,
      );
      expect(result).toEqual(mockResult);
    });

    it('should throw an error if refundPayment fails', async () => {
      const mockRefundPaymentDto: RefundPaymentDto = { amount: 50 };
      const mockId = 'payment-id';

      paymentsService.refundPayment.mockRejectedValue(
        new Error('Refund failed'),
      );

      await expect(
        paymentsController.refundPayment(mockRefundPaymentDto, mockId),
      ).rejects.toThrow('Refund failed');
    });
  });

  describe('findPaymentById', () => {
    it('should call findPaymentById and return the result', async () => {
      const mockId = 'payment-id';
      const mockResult: PaymentResponse = {
        id: 'payment-id',
        createdDate: '2021-09-01T00:00:00.000Z',
        originalAmount: 100,
        amount: 100,
        currency: 'USD',
        description: 'Test Payment',
        status: 'success',
        paymentMethod: 'card',
        cardId: 'card-id',
      };

      paymentsService.findPaymentById.mockResolvedValue(mockResult);

      const result = await paymentsController.findPaymentById(mockId);

      expect(paymentsService.findPaymentById).toHaveBeenCalledWith(mockId);
      expect(result).toEqual(mockResult);
    });

    it('should throw an error if findPaymentById fails', async () => {
      const mockId = 'payment-id';

      paymentsService.findPaymentById.mockRejectedValue(
        new Error('Payment not found'),
      );

      await expect(paymentsController.findPaymentById(mockId)).rejects.toThrow(
        'Payment not found',
      );
    });
  });
});
