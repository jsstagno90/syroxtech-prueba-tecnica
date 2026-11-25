import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Ingresá un correo válido').trim().toLowerCase(),
  password: z.string().min(1, 'Ingresá tu contraseña').max(100),
  remember: z.boolean().default(false),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginDto = z.output<typeof loginSchema>;

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  /** Segundos de validez del token. */
  expiresIn: number;
  user: AuthUser;
}
