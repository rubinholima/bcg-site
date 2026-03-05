import { Module } from '@nestjs/common';
import { HelloSignService } from './hello-sign.service';

@Module({
  providers: [HelloSignService],
  exports: [HelloSignService],
})
export class HelloSignModule {}
