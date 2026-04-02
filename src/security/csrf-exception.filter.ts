import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

type CsrfError = {
  code?: string;
};

@Catch()
export class CsrfExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (!this.isCsrfError(exception)) {
      throw exception;
    }

    const response = host.switchToHttp().getResponse<Response>();

    response.status(HttpStatus.FORBIDDEN).json({
      statusCode: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
      message: 'Invalid CSRF token',
    });
  }

  private isCsrfError(exception: unknown): exception is CsrfError {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }

    return (exception as CsrfError).code === 'EBADCSRFTOKEN';
  }
}