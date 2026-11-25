import { cookies } from 'next/headers';
import { loginSchema, type LoginResponse } from '@admin/shared';
import { SESSION_COOKIE } from '@/config/site';
import { API_URL, errorResponse, sessionCookieOptions } from '@/lib/server/backend';

/**
 * Login: valida con el mismo schema que la API, pide el JWT y lo guarda en una
 * cookie httpOnly. El token nunca queda accesible desde JavaScript del navegador.
 */
export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { statusCode: 400, message: parsed.error.issues.map((issue) => issue.message) },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
  } catch {
    return errorResponse(502, 'No se pudo conectar con el servidor. Probá de nuevo en unos segundos.');
  }

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    return Response.json(payload ?? { statusCode: upstream.status, message: 'No se pudo iniciar sesión' }, {
      status: upstream.status,
    });
  }

  const { accessToken, expiresIn, user } = payload as LoginResponse;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, accessToken, {
    ...sessionCookieOptions,
    // "Mantener sesión iniciada": cookie persistente. Si no, dura hasta cerrar el navegador.
    ...(parsed.data.remember && { maxAge: expiresIn }),
  });

  return Response.json({ user });
}
