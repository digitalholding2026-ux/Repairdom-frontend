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

/** Page de vérification d'un rôle. Un utilisateur non vérifié doit pouvoir
 *  y rester : c'est elle qui lui propose de renvoyer l'e-mail. */
function verificationPathFor(role: string | undefined): string | null {
  if (role === 'CLIENT') return '/client/verification';
  if (role === 'TECHNICIAN') return '/technicien/verification';
  return null;
}

export function decideGuard(input: GuardDecisionInput): GuardVerdict {
  const { loading, authenticated, role, emailVerified, expectedRole, pathname, publicPaths } = input;
  if (loading) return { action: 'loading' };

  /* `usePathname()` ne renvoie normalement QUE le chemin (la query string est
   * strippée par Next), mais on ne doit pasotrop à cette garantie : une URL
   * passée manuellement avec `?from=demande` ferait échouer l'égalité
   * ci-dessous et renverrait l'utilisateur sur lui-même. On compare donc sur le
   * chemin nu, sans query ni fragment. */
  const path = pathname.split('?')[0].split('#')[0];
  const isPublicPath = publicPaths.includes(path);

  if (authenticated) {
    /* ── Blocage par e-mail non vérifié ──────────────────────────────
     *
     * BUG CORRIGÉ (boucle infinie sur /client/verification) : la version
     * précédente laissait TOMBER l'utilisateur non vérifié qui était déjà sur
     * sa page de vérification dans le test `isPublicPath` ci-dessous, qui le
     * renvoyait vers `/client`. Or `/client` le rebascule ici par la règle
     * « e-mail non vérifié » : `/client/verification` → `/client` →
     * `/client/verification` → … sans jamais afficher la page.
     *
     * Règle : un utilisateur non vérifié qui est DÉJÀ sur sa page de
     * vérification doit être `show`, jamais redirigé. La redirection ne sert
     * qu'à l'y AMENER depuis le reste de l'espace.
     *
     * Symétrie TECHNICIAN conservée : sans effet tant que le backend vérifie
     * les techniciens à la création, mais bloquant dès qu'un compte non
     * vérifié obtiendrait une session. */
    const verificationPath = verificationPathFor(role);
    if (verificationPath && emailVerified === false) {
      if (path !== verificationPath) return { action: 'redirect', to: verificationPath };
      return { action: 'show' };
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
