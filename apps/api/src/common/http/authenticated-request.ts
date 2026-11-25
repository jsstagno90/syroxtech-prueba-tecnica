import type { Request } from 'express';
import type { AuthUser } from '@admin/shared';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
