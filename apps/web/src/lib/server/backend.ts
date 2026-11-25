/** URL de la API NestJS. Solo se usa del lado del servidor (route handlers). */
export const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export function errorResponse(status: number, message: string) {
  return Response.json({ statusCode: status, message }, { status });
}
