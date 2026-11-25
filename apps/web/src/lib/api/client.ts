import type { ApiErrorBody } from '@admin/shared';

/**
 * Cliente HTTP del panel. No habla directo con la API: pasa por
 * /api/backend (route handler de Next), que agrega el token desde la cookie httpOnly.
 */
const BASE_PATH = '/api/backend';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Mensajes de validación tal cual los devuelve la API (ej. "name: Mínimo 2 caracteres"). */
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions extends Omit<RequestInit, 'body'> {
  query?: object;
  body?: unknown;
}

function buildQueryString(query?: object) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query as Record<string, QueryValue>)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function request<T>(path: string, { query, body, headers, ...init }: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${BASE_PATH}/${path}${buildQueryString(query)}`, {
    ...init,
    headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    // La sesión venció o la cookie no existe: volvemos al login.
    // Navegación completa a propósito: descarta el estado y la caché de la sesión vencida.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== 'undefined') window.location.assign('/login?expired=1');
    throw new ApiError(401, 'Tu sesión venció. Volvé a iniciar sesión.');
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
    const details = Array.isArray(payload?.message) ? payload.message : payload?.message ? [payload.message] : [];
    const message = details[0]?.replace(/^\w+(\.\d+)?(\.\w+)?: /, '') ?? 'Ocurrió un error inesperado';
    throw new ApiError(response.status, message, details);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body' | 'method'>) => request<T>(path, options),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T = void>(path: string) => request<T>(path, { method: 'DELETE' }),
};
