import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ZodValidationPipe } from '../../common/validation/pipeline.validation';
import {
  CreatePaymentDto,
  CreatePaymentSchema,
} from './dto/create-payment.dto';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('PaymentsController', () => {
  let app: INestApplication;
  let paymentsService = { processPayment: jest.fn() };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: paymentsService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ZodValidationPipe(CreatePaymentSchema));
    await app.init();
  });

  it(`/POST /payments (valid data)`, () => {
    const createPaymentDto: CreatePaymentDto = {
      amount: 1000,
      currency: 'USD',
      description: 'Compra de produtos',
      paymentMethod: {
        type: 'card',
        card: {
          number: '4111111111111111',
          holderName: 'John Doe',
          cvv: '123',
          expirationDate: '12/2025',
          installments: 3,
        },
      },
    };

    paymentsService.processPayment.mockResolvedValue({ success: true });

    return request(app.getHttpServer())
      .post('/payments')
      .send(createPaymentDto)
      .expect(201)
      .expect({ success: true });
  });

  it(`/POST /payments (invalid data)`, () => {
    const invalidCreatePaymentDto = {};

    return request(app.getHttpServer())
      .post('/payments')
      .send(invalidCreatePaymentDto)
      .expect(400);
  });

  afterAll(async () => {
    await app.close();
  });
});
