import {
  CreatePaymentDto,
  CreatePaymentResponse,
} from '../dto/create-payment.dto';

export default interface PaymentProviderStrategy {
  processPayment(
    createPaymentDto: CreatePaymentDto,
  ): Promise<CreatePaymentResponse>;
}
