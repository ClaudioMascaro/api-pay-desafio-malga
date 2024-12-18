import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/validation/pipeline.validation';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  CreatePaymentSchema,
  RefundPaymentDto,
  RefundPaymentSchema,
} from './dto/payments.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('/')
  @UsePipes(new ZodValidationPipe(CreatePaymentSchema))
  async processPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.processPayment(createPaymentDto);
  }

  @Post('/:id/refund')
  async refundPayment(
    @Body(new ZodValidationPipe(RefundPaymentSchema))
    refundPaymentDto: RefundPaymentDto,
    @Param('id') id: string,
  ) {
    return this.paymentsService.refundPayment(id, refundPaymentDto);
  }

  @Get('/:id')
  async findPaymentById(@Param('id') id: string) {
    return this.paymentsService.findPaymentById(id);
  }
}
