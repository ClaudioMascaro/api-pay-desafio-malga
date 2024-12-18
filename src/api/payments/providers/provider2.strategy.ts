import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { CircuitBreakerService } from '../../circuit-breaker/circuit-breaker.service';
import {
  CreatePaymentDto,
  CreatePaymentResponse,
  PaymentStatus,
} from '../dto/create-payment.dto';
import {
  Provider2CreatePaymentDto,
  Provider2CreatePaymentResponse,
} from './dto/provider2.dto';
import { lastValueFrom } from 'rxjs';
import PaymentProviderStrategy from './payment-provider.interface';
import CircuitBreaker from 'opossum';

@Injectable()
export class Provider2Strategy implements PaymentProviderStrategy {
  private readonly logger = new Logger(Provider2Strategy.name);
  private circuitBreaker: CircuitBreaker<
    [CreatePaymentDto],
    CreatePaymentResponse
  >;

  private statusDictionary: { [key: string]: PaymentStatus } = {
    paid: 'success',
    failed: 'refused',
    voided: 'refunded',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {
    this.circuitBreaker = this.circuitBreakerService.createCircuitBreaker<
      [CreatePaymentDto],
      CreatePaymentResponse
    >(async (dto) => this.executeRequest(dto));
  }

  async processPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse> {
    try {
      return await this.circuitBreaker.fire(createPaymentDto);
    } catch (error) {
      this.logger.error(`Erro no Provider2Strategy: ${error.message}`);
      throw error;
    }
  }

  private async executeRequest(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse> {
    const apiUrl = this.configService.get<string>('payments.provider2.apiUrl');

    const expirationArr =
      createPaymentDto.paymentMethod.card.expirationDate.split('/');

    const expirationMonth = expirationArr[0];
    const expirationYear = expirationArr[1].slice(-2);

    const provider2CreatePaymentDto: Provider2CreatePaymentDto = {
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      statementDescriptor: createPaymentDto.description,
      paymentType: createPaymentDto.paymentMethod.type,
      card: {
        number: createPaymentDto.paymentMethod.card.number,
        holder: createPaymentDto.paymentMethod.card.holderName,
        cvv: createPaymentDto.paymentMethod.card.cvv,
        expiration: `${expirationMonth}/${expirationYear}`,
        installmentNumber: createPaymentDto.paymentMethod.card.installments,
      },
    };

    const response = await lastValueFrom(
      this.httpService.post<Provider2CreatePaymentResponse>(
        apiUrl + '/transactions',
        provider2CreatePaymentDto,
        { timeout: 1000 },
      ),
    );

    if (response.status >= 500) {
      throw new Error('Erro ao processar pagamento');
    }

    const { data } = response;

    return {
      id: data.id,
      createdDate: data.date,
      status: this.statusDictionary[data.status],
      amount: data.amount,
      originalAmount: data.originalAmount,
      currency: data.currency,
      description: data.statementDescriptor,
      paymentMethod: 'card',
      cardId: data.cardId,
      provider: 'provider2',
    };
  }
}
