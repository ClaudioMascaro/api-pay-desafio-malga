import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { Provider2Service } from './provider2.service';
import {
  CreatePaymentDto,
  CreatePaymentSchema,
} from './dto/create-payment.dto';
import { ZodValidationPipe } from '../../common/validation/pipeline.validation';

@Controller('provider1')
export class Provider2Controller {
  constructor(private readonly provider1Service: Provider2Service) {}

  @Post('transactions')
  @UsePipes(new ZodValidationPipe(CreatePaymentSchema))
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.provider1Service.processPayment(createPaymentDto);
  }
}
