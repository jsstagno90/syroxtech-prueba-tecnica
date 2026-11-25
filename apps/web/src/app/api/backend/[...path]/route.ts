import type { NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/config/site';
import { API_URL, errorResponse } from '@/lib/server/backend';

/**
 * Backend-for-frontend: reenvía /api/backend/* a la API NestJS agregando el JWT
 * que está en la cookie httpOnly. El destino siempre es API_URL, así el token
 * no puede terminar en otro servidor.
 */
async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return errorResponse(401, 'No hay una sesión activa');

  const { path } = await params;
  if (path.some((segment) => segment === '.' || segment === '..')) {
    return errorResponse(400, 'Ruta inválida');
  }

  const target = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, API_URL);
  target.search = request.nextUrl.search;

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const contentType = request.headers.get('content-type');

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(contentType && { 'Content-Type': contentType }),
      },
      body: hasBody ? await request.text() : undefined,
      cache: 'no-store',
      redirect: 'error',
    });
  } catch {
    return errorResponse(502, 'No se pudo conectar con el servidor');
  }

  const response = new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });

  // Token vencido o inválido: borramos la cookie para que el proxy mande al login.
  if (upstream.status === 401) {
    response.headers.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  }
  return response;
}

export { forward as GET, forward as POST, forward as PATCH, forward as PUT, forward as DELETE };
