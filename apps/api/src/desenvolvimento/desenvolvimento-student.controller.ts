import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { DesenvolvimentoService } from './desenvolvimento.service';
import type { QuizAnswerInput } from './desenvolvimento.util';

type ReqUser = Request & { user?: { sub?: string; role?: string } };

@Controller('desenvolvimento')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('desenvolvimento')
export class DesenvolvimentoStudentController {
  constructor(private readonly service: DesenvolvimentoService) {}

  private actor(req: ReqUser) {
    return { sub: req.user?.sub ?? '', role: req.user?.role };
  }

  @Get('hub')
  hub(@Req() req: ReqUser) {
    return this.service.getStudentHub(this.actor(req));
  }

  @Get('my-courses')
  myCourses(@Req() req: ReqUser) {
    return this.service.listMyCourses(this.actor(req));
  }

  @Get('catalog')
  catalog(@Req() req: ReqUser) {
    return this.service.listCatalog(this.actor(req));
  }

  @Get('courses/:courseId/player')
  player(@Req() req: ReqUser, @Param('courseId') courseId: string) {
    return this.service.getPlayer(this.actor(req), courseId);
  }

  @Post('enrollments/:enrollmentId/lessons/:lessonId/touch')
  touchLesson(
    @Req() req: ReqUser,
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.service.touchLesson(this.actor(req), enrollmentId, lessonId);
  }

  @Post('enrollments/:enrollmentId/lessons/:lessonId/complete')
  completeLesson(
    @Req() req: ReqUser,
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.service.completeLesson(this.actor(req), enrollmentId, lessonId);
  }

  @Post('enrollments/:enrollmentId/lessons/:lessonId/quiz/submit')
  submitQuiz(
    @Req() req: ReqUser,
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: { answers: QuizAnswerInput[] },
  ) {
    return this.service.submitQuiz(
      this.actor(req),
      enrollmentId,
      lessonId,
      body.answers ?? [],
    );
  }
}
