'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from './auth-provider';
import { homePathForRole } from '@/lib/api/auth-service';

interface RoleGuardProps {
  expectedRole: 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
  publicPaths: string[];
  children: ReactNode;
}

export function RoleGuard({ expectedRole, publicPaths, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const { user, authenticated, loading } = useAuth();

  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    if (loading) return;

    if (authenticated) {
      if (
        user?.role === 'CLIENT' &&
        user.emailVerified === false &&
        pathname !== '/client/verification'
      ) {
        router.replace('/client/verification');
        return;
      }
      if ((user?.role ?? '') !== expectedRole || isPublicPath) {
        router.replace(homePathForRole(user?.role));
        return;
      }
    } else if (!isPublicPath) {
      const fallback = publicPaths[0] ?? '/';
      const query = publicPaths[0] && pathname
        ? `?redirect=${encodeURIComponent(pathname)}`
        : '';
      router.replace(`${fallback}${query}`);
    }
  }, [loading, authenticated, user, isPublicPath, expectedRole, pathname, publicPaths, router]);

  let showContent = false;
  if (!loading) {
    if (isPublicPath) {
      showContent = !authenticated;
    } else if (authenticated && (user?.role ?? '') === expectedRole) {
      const unverifiedClientGated =
        expectedRole === 'CLIENT' &&
        user?.role === 'CLIENT' &&
        user.emailVerified === false &&
        pathname !== '/client/verification';
      showContent = !unverifiedClientGated;
    }
  }

  if (!showContent) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}