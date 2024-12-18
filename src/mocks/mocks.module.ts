import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { Provider1Module } from './provider1/provider1.module';
import { Provider2Module } from './provider2/provider2.module';
import { LoggerMiddleware } from '../common/middleware/logger.middleware';

@Module({
  imports: [Provider1Module, Provider2Module],
})
export class MocksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
