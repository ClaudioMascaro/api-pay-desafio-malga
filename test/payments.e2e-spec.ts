import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/api/app.module';
import { CreatePaymentDto } from '../src/api/payments/dto/create-payment.dto';
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
    app.enableVersioning({
      type: VersioningType.URI,
    });
    await app.init();

    const mockModuleFixture: TestingModule = await Test.createTestingModule({
      imports: [MocksModule],
    }).compile();

    mockApp = mockModuleFixture.createNestApplication();
    mockApp.setGlobalPrefix('mocks');
    await mockApp.init();
    await mockApp.listen(3001);
  });

  it('/v1/payments (POST) - should create a payment', async () => {
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
        .post('/v1/payments')
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
          provider: expect.stringMatching(/provider1|provider2/),
        }),
      );
    }
  });

  afterAll(async () => {
    await app.close();
    await mockApp.close();
  });
});
