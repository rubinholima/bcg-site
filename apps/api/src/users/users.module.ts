import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CognitoModule } from '../cognito/cognito.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, CognitoModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
