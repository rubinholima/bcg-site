import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { GroupService } from './group.service';
import { UpdateGroupDto } from './dto/update-group.dto';

@Controller('group')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  /** Público: nome e logo para exibir no header/sidebar. */
  @Get()
  getGroup() {
    return this.groupService.findOne();
  }

  @Get(':slug')
  getGroupBySlug(@Param('slug') slug: string) {
    return this.groupService.findOne(slug);
  }

  /** Apenas super_admin pode alterar o grupo master. */
  @Patch()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  updateGroup(@Body() dto: UpdateGroupDto) {
    return this.groupService.update('bcg', dto);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  updateGroupBySlug(@Param('slug') slug: string, @Body() dto: UpdateGroupDto) {
    return this.groupService.update(slug, dto);
  }
}
