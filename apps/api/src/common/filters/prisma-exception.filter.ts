import { type ArgumentsHost, Catch, type ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Traduce los errores conocidos de Prisma a respuestas HTTP claras,
 * para que nunca le llegue un 500 genérico al panel por un caso esperable.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const [statusCode, message] = this.map(exception);

    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${exception.code}: ${exception.message}`);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      error: HttpStatus[statusCode],
    });
  }

  private map(exception: Prisma.PrismaClientKnownRequestError): [number, string] {
    switch (exception.code) {
      case 'P2002':
        return [HttpStatus.CONFLICT, 'Ya existe un registro con ese valor'];
      case 'P2003':
        return [HttpStatus.CONFLICT, 'La operación no es posible porque hay registros relacionados'];
      case 'P2025':
        return [HttpStatus.NOT_FOUND, 'El registro no existe'];
      default:
        return [HttpStatus.INTERNAL_SERVER_ERROR, 'Error inesperado de base de datos'];
    }
  }
}
