import { Body, Controller, Post, UsePipes, Version } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/validation/pipeline.validation';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  CreatePaymentSchema,
} from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Version('1')
  @Post('/')
  @UsePipes(new ZodValidationPipe(CreatePaymentSchema))
  async createCustomer(
    @Body() createPaymentDto: CreatePaymentDto,
  ): Promise<object> {
    return this.paymentsService.processPayment(createPaymentDto);
  }
}
