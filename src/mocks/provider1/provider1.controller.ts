import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { Provider1Service } from './provider1.service';
import {
  CreateChargeDto,
  CreateChargeSchema,
  RefundChargeDto,
  RefundChargeSchema,
} from './dto/charges.dto';
import { ZodValidationPipe } from '../../common/validation/pipeline.validation';

@Controller('provider1')
export class Provider1Controller {
  constructor(private readonly provider1Service: Provider1Service) {}

  @Post('charges')
  @UsePipes(new ZodValidationPipe(CreateChargeSchema))
  async createCharge(@Body() createChargeDto: CreateChargeDto) {
    return this.provider1Service.createCharge(createChargeDto);
  }

  @Post('refund/:id')
  async refundCharge(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RefundChargeSchema))
    refundChargeDto: RefundChargeDto,
  ) {
    return this.provider1Service.refundCharge(id, refundChargeDto);
  }

  @Get('charges/:id')
  async getCharge(@Param('id') id: string) {
    return this.provider1Service.getCharge(id);
  }
}
