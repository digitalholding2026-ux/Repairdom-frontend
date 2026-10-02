/* Décision pure du garde de rôle (testable sans React ni bundler : aucune
 * dépendance, aucun alias `@/` — les tests Node natifs ne résolvent pas les
 * alias). Réplique exacte de la logique historiquement portée par `RoleGuard`
 * (vérification e-mail, rôle attendu, chemins publics, `?redirect=`).
 * `roleHomePath` est le miroir local de `homePathForRole`
 * (`lib/api/auth-service.ts`, source canonique) — un test statique vérifie
 * que les deux restent alignés. Le composant ne fait qu'exécuter le verdict
 * (afficher / écran de chargement / rediriger). La validation réelle de
 * session reste serveur (`GET /auth/me`). */

export type GuardRole = 'CLIENT' | 'TECHNICIAN' | 'ADMIN';

/** Miroir local de `homePathForRole` (canonique dans
 *  `lib/api/auth-service.ts`) — dupliqué ici uniquement pour garder ce
 *  module importable par les tests Node natifs (pas d'alias `@/`). */
function roleHomePath(role: string | undefined): string {
  if (role === 'TECHNICIAN') return '/technicien';
  if (role === 'ADMIN') return '/admin';
  return '/client';
}

export type GuardVerdict =
  | { action: 'loading' }
  | { action: 'show' }
  | { action: 'redirect'; to: string };

interface GuardDecisionInput {
  loading: boolean;
  authenticated: boolean;
  role: string | undefined;
  emailVerified: boolean | undefined;
  expectedRole: GuardRole;
  pathname: string;
  publicPaths: string[];
}

export function decideGuard(input: GuardDecisionInput): GuardVerdict {
  const { loading, authenticated, role, emailVerified, expectedRole, pathname, publicPaths } = input;
  if (loading) return { action: 'loading' };

  const isPublicPath = publicPaths.includes(pathname);

  if (authenticated) {
    if (role === 'CLIENT' && emailVerified === false && pathname !== '/client/verification') {
      return { action: 'redirect', to: '/client/verification' };
    }
    // Symétrie TECHNICIAN : sans effet tant que le backend vérifie les
    // techniciens à la création, mais bloque tout accès si un compte
    // technicien non vérifié obtient un jour une session.
    if (
      role === 'TECHNICIAN' &&
      emailVerified === false &&
      pathname !== '/technicien/verification'
    ) {
      return { action: 'redirect', to: '/technicien/verification' };
    }
    if ((role ?? '') !== expectedRole || isPublicPath) {
      return { action: 'redirect', to: roleHomePath(role) };
    }
    return { action: 'show' };
  }

  if (isPublicPath) return { action: 'show' };
  const fallback = publicPaths[0] ?? '/';
  const query = publicPaths[0] && pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
  return { action: 'redirect', to: `${fallback}${query}` };
}
