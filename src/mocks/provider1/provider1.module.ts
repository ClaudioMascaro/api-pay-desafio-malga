import { Module } from '@nestjs/common';
import { Provider1Controller } from './provider1.controller';
import { Provider1Service } from './provider1.service';

@Module({
  controllers: [Provider1Controller],
  providers: [Provider1Service],
})
export class Provider1Module {}
