import { NestFactory } from '@nestjs/core';
import { MocksModule } from './mocks/mocks.module';

async function bootstrapMocks() {
  const mockApp = await NestFactory.create(MocksModule);

  mockApp.setGlobalPrefix('mocks');
  await mockApp.listen(3001);
}
bootstrapMocks();
