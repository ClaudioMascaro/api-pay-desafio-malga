import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { Provider1Service } from './provider1.service';
import {
  CreatePaymentDto,
  CreatePaymentSchema,
} from './dto/create-payment.dto';
import { ZodValidationPipe } from '../../common/validation/pipeline.validation';

@Controller('provider1')
export class Provider1Controller {
  constructor(private readonly provider1Service: Provider1Service) {}

  @Post('charges')
  @UsePipes(new ZodValidationPipe(CreatePaymentSchema))
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.provider1Service.processPayment(createPaymentDto);
  }
}
