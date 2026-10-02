/* Filtre anti-flash basé sur la PRÉSENCE du cookie (jamais de décodage
 * JWT ici : la validation réelle reste côté `RoleGuard` + `AuthProvider`
 * via `GET /auth/me`). Pur et testable, utilisé par `src/middleware.ts`.
 * Miroir des `*_PUBLIC_PATHS` des layouts (client/technicien) : toute
 * divergence doit être alignée des deux côtés. */

export const AUTH_COOKIE_NAME = 'repairdom_token';

interface ProtectedScope {
  prefix: string;
  login: string;
  publicPaths: string[];
}

export const PROTECTED_SCOPES: ProtectedScope[] = [
  {
    prefix: '/client',
    login: '/client/connexion',
    publicPaths: ['/client/connexion', '/client/inscription', '/client/verification'],
  },
  {
    prefix: '/technicien',
    login: '/technicien/connexion',
    publicPaths: ['/technicien/connexion', '/technicien/inscription', '/technicien/verification'],
  },
  {
    prefix: '/admin',
    login: '/',
    publicPaths: [],
  },
];

/** URL de redirection si la requête doit être interceptée, `null` sinon. */
export function authRedirectFor(pathname: string, search: string, hasCookie: boolean): string | null {
  const scope = PROTECTED_SCOPES.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  if (!scope) return null;
  if (scope.publicPaths.includes(pathname)) return null;
  if (hasCookie) return null;
  const origin = `${pathname}${search}`;
  return `${scope.login}?redirect=${encodeURIComponent(origin)}`;
}
