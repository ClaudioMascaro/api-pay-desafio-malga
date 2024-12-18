import { Module } from '@nestjs/common';
import { Provider1Module } from './provider1/provider1.module';
import { Provider2Module } from './provider2/provider2.module';

@Module({
  imports: [Provider1Module, Provider2Module],
})
export class MocksModule {}
