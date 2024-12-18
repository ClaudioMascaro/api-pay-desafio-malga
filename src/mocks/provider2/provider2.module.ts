import { Module } from '@nestjs/common';
import { Provider2Controller } from './provider2.controller';
import { Provider2Service } from './provider2.service';

@Module({
  controllers: [Provider2Controller],
  providers: [Provider2Service],
})
export class Provider2Module {}
