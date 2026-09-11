'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getMe, homePathForRole } from '@/lib/api/auth-service';
import { Spinner } from '@/components/ui/spinner';

interface RoleGuardProps {
  expectedRole: 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
  publicPaths: string[];
  children: ReactNode;
}

export function RoleGuard({ expectedRole, publicPaths, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      let role: string | undefined;
      let emailVerified: boolean | undefined;
      let authenticated = true;
      try {
        const me = await getMe();
        role = me.role;
        emailVerified = me.emailVerified;
      } catch {
        authenticated = false;
      }
      if (cancelled) return;

      const isPublicPath = publicPaths.includes(pathname ?? '');

      if (authenticated) {
        // Comptes clients dont l'email n'a pas été vérifié : on les redirige
        // vers la page de vérification (sauf s'ils sont déjà dessus).
        if (role === 'CLIENT' && emailVerified === false && pathname !== '/client/verification') {
          router.replace('/client/verification');
          return;
        }

        if (role !== expectedRole || isPublicPath) {
          router.replace(homePathForRole(role));
          return;
        }
      } else {
        if (!isPublicPath) {
          router.replace(publicPaths[0] ?? '/');
          return;
        }
      }

      setReady(true);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, expectedRole, router, publicPaths]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}