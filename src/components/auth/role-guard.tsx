'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from './auth-provider';
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
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6">
        <Logo className="h-10 w-auto" />
        <div className="w-full max-w-xs space-y-2" aria-hidden>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
