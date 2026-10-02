'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import { LoadingScreen } from './loading-screen';
import { decideGuard } from '@/lib/guard-decision';

interface RoleGuardProps {
  expectedRole: 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
  publicPaths: string[];
  children: ReactNode;
}

/* Garde de rôle (filet de sécurité, seule protection des routes depuis la
 * suppression du middleware — inadapté au cross-domain Railway/Vercel).
 * Pendant la vérification de session (`loading`), un écran neutre plein
 * écran est affiché (logo + squelettes, aucun contenu métier) : ni flash
 * de dashboard, ni redirection prématurée vers la connexion. */
export function RoleGuard({ expectedRole, publicPaths, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { user, authenticated, loading } = useAuth();

  const verdict = decideGuard({
    loading,
    authenticated,
    role: user?.role,
    emailVerified: user?.emailVerified,
    expectedRole,
    pathname,
    publicPaths,
  });

  const redirectTo = verdict.action === 'redirect' ? verdict.to : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (verdict.action !== 'show') {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
