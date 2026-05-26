import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContractTemplatesService } from '../cadastros/contract-templates.service';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [PrismaModule, S3Module],
  providers: [ContractTemplatesService],
  exports: [ContractTemplatesService],
})
export class ContractsModule {}
