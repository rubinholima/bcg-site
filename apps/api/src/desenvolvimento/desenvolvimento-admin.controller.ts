import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { DesenvolvimentoService } from './desenvolvimento.service';
import type {
  LearningAssignmentMode,
  LearningCourseStatus,
  LearningLessonType,
} from './desenvolvimento.constants';

type ReqUser = Request & { user?: { sub?: string; role?: string } };

@Controller('desenvolvimento/admin')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('desenvolvimento__desenvolvimento_admin')
export class DesenvolvimentoAdminController {
  constructor(private readonly service: DesenvolvimentoService) {}

  private actor(req: ReqUser) {
    return { sub: req.user?.sub ?? '', role: req.user?.role };
  }

  @Get('courses')
  listCourses(@Req() req: ReqUser, @Query('tenantId') tenantId?: string) {
    return this.service.listAdminCourses(this.actor(req), tenantId);
  }

  @Get('courses/:courseId')
  getCourse(@Req() req: ReqUser, @Param('courseId') courseId: string) {
    return this.service.getAdminCourse(this.actor(req), courseId);
  }

  @Post('courses')
  createCourse(
    @Req() req: ReqUser,
    @Body()
    body: {
      title: string;
      subtitle?: string;
      description?: string;
      category?: string;
      tenantId?: string | null;
    },
  ) {
    return this.service.createCourse(this.actor(req), body);
  }

  @Patch('courses/:courseId')
  updateCourse(
    @Req() req: ReqUser,
    @Param('courseId') courseId: string,
    @Body()
    body: {
      title?: string;
      subtitle?: string | null;
      description?: string | null;
      category?: string | null;
      tenantId?: string | null;
    },
  ) {
    return this.service.updateCourse(this.actor(req), courseId, body);
  }

  @Post('courses/:courseId/status')
  setStatus(
    @Req() req: ReqUser,
    @Param('courseId') courseId: string,
    @Body('status') status: LearningCourseStatus,
  ) {
    return this.service.setCourseStatus(this.actor(req), courseId, status);
  }

  @Post('courses/:courseId/modules')
  upsertModule(
    @Req() req: ReqUser,
    @Param('courseId') courseId: string,
    @Body() body: { id?: string; title: string; sortOrder: number },
  ) {
    return this.service.upsertModule(this.actor(req), courseId, body);
  }

  @Delete('courses/:courseId/modules/:moduleId')
  deleteModule(
    @Req() req: ReqUser,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.service.deleteModule(this.actor(req), courseId, moduleId);
  }

  @Post('courses/:courseId/modules/:moduleId/lessons')
  upsertLesson(
    @Req() req: ReqUser,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body()
    body: {
      id?: string;
      title: string;
      sortOrder: number;
      lessonType: LearningLessonType;
      contentHtml?: string | null;
      externalUrl?: string | null;
      estimatedMinutes?: number | null;
      quiz?: {
        passingScore?: number;
        maxAttempts?: number;
        questions?: {
          question: string;
          options: string[];
          correctIndex: number;
        }[];
      };
    },
  ) {
    return this.service.upsertLesson(this.actor(req), courseId, moduleId, body);
  }

  @Delete('courses/:courseId/modules/:moduleId/lessons/:lessonId')
  deleteLesson(
    @Req() req: ReqUser,
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.service.deleteLesson(
      this.actor(req),
      courseId,
      moduleId,
      lessonId,
    );
  }

  @Post('courses/:courseId/lessons/:lessonId/upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
  )
  uploadLessonFile(
    @Req() req: ReqUser,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @UploadedFile()
    file:
      | { buffer: Buffer; originalname: string; mimetype?: string }
      | undefined,
  ) {
    if (!file?.buffer) throw new BadRequestException('Arquivo obrigatório.');
    return this.service.uploadLessonFile(
      this.actor(req),
      courseId,
      lessonId,
      file,
    );
  }

  @Get('courses/:courseId/assignments')
  listAssignments(@Req() req: ReqUser, @Param('courseId') courseId: string) {
    return this.service.listAssignments(this.actor(req), courseId);
  }

  @Post('courses/:courseId/assignments')
  createAssignment(
    @Req() req: ReqUser,
    @Param('courseId') courseId: string,
    @Body()
    body: {
      targetMode: LearningAssignmentMode;
      tenantId?: string | null;
      targetRoleSlug?: string | null;
      targetUserId?: string | null;
      mandatory?: boolean;
      dueAt?: string | null;
    },
  ) {
    return this.service.createAssignment(this.actor(req), courseId, body);
  }

  @Get('courses/:courseId/progress')
  listProgress(@Req() req: ReqUser, @Param('courseId') courseId: string) {
    return this.service.listAdminProgress(this.actor(req), courseId);
  }
}
