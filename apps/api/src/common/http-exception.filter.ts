import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : typeof exception === 'object' && exception !== null
            ? (exception as { message?: string }).message ?? JSON.stringify(exception)
            : String(exception);

    const body =
      typeof message === 'object' && message !== null && 'message' in message
        ? (message as { message: string | string[] }).message
        : String(message);
    const msg = Array.isArray(body) ? body.join(', ') : body;

    this.logger.error(
      `[${status}] ${msg}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message: msg,
    });
  }
}
