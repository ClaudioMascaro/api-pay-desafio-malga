import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { Provider1Strategy } from './providers/provider1.strategy';
import { Provider2Strategy } from './providers/provider2.strategy';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [HttpModule, ConfigModule, CircuitBreakerModule],
  providers: [PaymentsService, Provider1Strategy, Provider2Strategy],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
