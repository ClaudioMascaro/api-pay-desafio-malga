import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/api/app.module';
import { CreatePaymentDto } from '../src/api/payments/dto/payments.dto';
import { MocksModule } from '../src/mocks/mocks.module';

describe('PaymentsController (e2e)', () => {
  jest.setTimeout(120000);
  let app: INestApplication;
  let mockApp: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const mockModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [MocksModule],
    }).compile();

    mockApp = mockModuleFixture.createNestApplication();
    mockApp.setGlobalPrefix('mocks');
    await mockApp.init();
    await mockApp.listen(3001);
  });

  it('/payments (POST) - should create many payments between providers successfully', async () => {
    const createPaymentDto: CreatePaymentDto = {
      amount: 1000,
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

    for (let i = 0; i < 50; i++) {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .send(createPaymentDto)
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          createdDate: expect.any(String),
          status: expect.any(String),
          amount: createPaymentDto.amount,
          currency: createPaymentDto.currency,
          description: createPaymentDto.description,
          paymentMethod: 'card',
          cardId: expect.any(String),
        }),
      );
    }
  });

  it('/payments/:id (GET) - should retrieve a payment after creation', async () => {
    const createPaymentDto: CreatePaymentDto = {
      amount: 1000,
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

    const { body: createdPayment } = await request(app.getHttpServer())
      .post('/payments')
      .send(createPaymentDto)
      .expect(201);

    const paymentId = createdPayment.id;

    const paymentResponse = await request(app.getHttpServer())
      .get(`/payments/${paymentId}`)
      .expect(200);

    expect(paymentResponse.body).toEqual(createdPayment);
  });

  it('/payments/:id/refund (POST) - should refund a success payment after creation and get the updated payment', async () => {
    const createPaymentDto: CreatePaymentDto = {
      amount: 1000,
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

    const { body: createdPayment } = await request(app.getHttpServer())
      .post('/payments')
      .send(createPaymentDto)
      .expect(201);

    const paymentId = createdPayment.id;

    const { body: refundedPayment } = await request(app.getHttpServer())
      .post(`/payments/${paymentId}/refund`)
      .send({ amount: 1000 })
      .expect(201);

    expect(refundedPayment).toEqual(
      expect.objectContaining({
        id: createdPayment.id,
        createdDate: createdPayment.createdDate,
        status: 'refunded',
        amount: createdPayment.amount,
        currency: createdPayment.currency,
        description: createdPayment.description,
        paymentMethod: createdPayment.paymentMethod,
        cardId: createdPayment.cardId,
      }),
    );

    const { body: updatedPayment } = await request(app.getHttpServer())
      .get(`/payments/${paymentId}`)
      .expect(200);

    expect(updatedPayment).toEqual(refundedPayment);
  });

  afterAll(async () => {
    await app.close();
    await mockApp.close();
  });
});
