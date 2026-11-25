import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@admin/shared';
import type { AuthenticatedRequest } from '../http/authenticated-request.js';

/** Inyecta el usuario autenticado que dejó el guard en la request. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user!;
});
