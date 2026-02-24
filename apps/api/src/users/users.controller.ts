import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { UsersService, UserRole } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get(':username')
  async findOne(@Param('username') username: string) {
    const user = await this.usersService.findOne(decodeURIComponent(username));
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return await this.usersService.create(dto);
  }

  @Patch(':username/role')
  async updateRole(
    @Param('username') username: string,
    @Body() dto: UpdateRoleDto,
  ) {
    await this.usersService.updateRole(decodeURIComponent(username), dto.role as UserRole);
    return { ok: true };
  }

  @Patch(':username')
  async update(
    @Param('username') username: string,
    @Body() dto: UpdateUserDto,
  ) {
    await this.usersService.update(decodeURIComponent(username), {
      name: dto.name,
      email: dto.email,
      role: dto.role as UserRole,
      password: dto.password,
    });
    return { ok: true };
  }

  @Delete(':username')
  async remove(@Param('username') username: string) {
    await this.usersService.remove(decodeURIComponent(username));
    return { ok: true };
  }
}
