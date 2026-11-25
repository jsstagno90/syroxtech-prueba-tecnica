import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/config/site';

/**
 * Chequeo optimista de sesión antes de renderizar: sin cookie no se entra al panel.
 * La validación real del token la hace la API en cada request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLoginPage = pathname === '/login';

  if (!hasSession && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Todo menos los route handlers (/api), los assets de Next y los archivos estáticos.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
