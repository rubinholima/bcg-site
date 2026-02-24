import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { isCredentialsProviderError, isAwsAccessDeniedError } from '../common/aws-credentials';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const AWS_CREDENTIALS_MESSAGE =
  'AWS credentials not configured. For local dev: run `aws configure` or set AWS_PROFILE in .env, or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY. See docs/DESENVOLVIMENTO_DIARIO.md (seção AWS_CREDENTIALS).';

const AWS_ACCESS_DENIED_MESSAGE =
  'AWS Access Denied: o usuário IAM não tem permissão no User Pool. Verifique a política IAM (ListUsers, AdminListGroupsForUser, etc.) e o ARN do pool em docs/DESENVOLVIMENTO_DIARIO.md (seção AWS_CREDENTIALS).';

@Controller('users')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    try {
      return await this.usersService.findAll();
    } catch (err) {
      if (isCredentialsProviderError(err)) {
        console.error('[UsersController] GET /users failed: AWS credentials not found');
        throw new InternalServerErrorException(AWS_CREDENTIALS_MESSAGE);
      }
      if (isAwsAccessDeniedError(err)) {
        console.error('[UsersController] GET /users failed: AWS Access Denied');
        throw new InternalServerErrorException(AWS_ACCESS_DENIED_MESSAGE);
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[UsersController] GET /users failed:', err);
      throw new InternalServerErrorException(`GET /users: ${msg}`);
    }
  }

  @Get(':username')
  async findOne(@Param('username') username: string) {
    try {
      const user = await this.usersService.findOne(decodeURIComponent(username));
      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }
      return user;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`GET /users/:username: ${msg}`);
    }
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    try {
      return await this.usersService.create(dto);
    } catch (err) {
      if (isCredentialsProviderError(err)) {
        throw new InternalServerErrorException(AWS_CREDENTIALS_MESSAGE);
      }
      if (isAwsAccessDeniedError(err)) {
        throw new InternalServerErrorException(AWS_ACCESS_DENIED_MESSAGE);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`POST /users: ${msg}`);
    }
  }

  @Patch(':username/role')
  async updateRole(
    @Param('username') username: string,
    @Body() dto: UpdateRoleDto,
  ) {
    try {
      await this.usersService.updateRole(decodeURIComponent(username), dto.role);
      return { ok: true };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (isCredentialsProviderError(err)) {
        throw new InternalServerErrorException(AWS_CREDENTIALS_MESSAGE);
      }
      if (isAwsAccessDeniedError(err)) {
        throw new InternalServerErrorException(AWS_ACCESS_DENIED_MESSAGE);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`PATCH /users/:username/role: ${msg}`);
    }
  }

  @Patch(':username')
  async update(
    @Param('username') username: string,
    @Body() dto: UpdateUserDto,
  ) {
    try {
      await this.usersService.update(decodeURIComponent(username), {
        name: dto.name,
        email: dto.email,
        role: dto.role as import('../cognito/cognito.service').CognitoRole,
      });
      return { ok: true };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (isCredentialsProviderError(err)) {
        throw new InternalServerErrorException(AWS_CREDENTIALS_MESSAGE);
      }
      if (isAwsAccessDeniedError(err)) {
        throw new InternalServerErrorException(AWS_ACCESS_DENIED_MESSAGE);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`PATCH /users/:username: ${msg}`);
    }
  }

  @Delete(':username')
  async remove(@Param('username') username: string) {
    try {
      await this.usersService.remove(decodeURIComponent(username));
      return { ok: true };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (isCredentialsProviderError(err)) {
        throw new InternalServerErrorException(AWS_CREDENTIALS_MESSAGE);
      }
      if (isAwsAccessDeniedError(err)) {
        throw new InternalServerErrorException(AWS_ACCESS_DENIED_MESSAGE);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`DELETE /users/:username: ${msg}`);
    }
  }
}
