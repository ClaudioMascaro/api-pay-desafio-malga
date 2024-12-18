import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerMiddleware } from '../common/middleware/logger.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import payments from './config/payments';
import circuitBreaker from './config/circuit-breaker';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [payments, circuitBreaker] }),
    CircuitBreakerModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
