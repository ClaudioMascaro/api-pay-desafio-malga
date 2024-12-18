import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { Provider2Service } from './provider2.service';
import {
  CreateTransactionDto,
  CreateTransactionSchema,
  RefundTransactionDto,
  RefundTransactionSchema,
} from './dto/transactions.dto';
import { ZodValidationPipe } from '../../common/validation/pipeline.validation';

@Controller('provider2')
export class Provider2Controller {
  constructor(private readonly provider2Service: Provider2Service) {}

  @Post('transactions')
  @UsePipes(new ZodValidationPipe(CreateTransactionSchema))
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    return this.provider2Service.createTransaction(createTransactionDto);
  }

  @Post('void/:id')
  async refundTransaction(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RefundTransactionSchema))
    refundTransactionDto: RefundTransactionDto,
  ) {
    return this.provider2Service.refundTransaction(id, refundTransactionDto);
  }

  @Get('transactions/:id')
  async getTransaction(@Param('id') id: string) {
    return this.provider2Service.getTransaction(id);
  }
}
