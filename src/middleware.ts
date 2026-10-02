import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, authRedirectFor } from '@/lib/route-protection';

/* Middleware anti-flash : redirige AVANT le premier rendu React quand le
 * cookie de session est absent. La validation réelle reste côté `RoleGuard`
 * + `AuthProvider` (filet de sécurité si le cookie existe mais est invalide).
 * Le JWT n'est JAMAIS décodé ici (pas de duplication de la signature). */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasCookie = request.cookies.has(AUTH_COOKIE_NAME);
  const redirect = authRedirectFor(pathname, search, hasCookie);
  if (redirect) {
    return NextResponse.redirect(new URL(redirect, request.url), 307);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/client/:path*', '/technicien/:path*', '/admin/:path*'],
};
