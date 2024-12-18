import {
  CreatePaymentDto,
  PaymentResponse,
  RefundPaymentDto,
} from '../dto/payments.dto';

export default interface PaymentProviderStrategy {
  processPayment(createPaymentDto: CreatePaymentDto): Promise<PaymentResponse>;
  findPaymentById(id: string): Promise<PaymentResponse>;
  refundPayment(
    id: string,
    refundPaymentDto: RefundPaymentDto,
  ): Promise<PaymentResponse>;
}
