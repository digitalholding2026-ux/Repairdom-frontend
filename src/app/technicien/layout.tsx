'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BottomNav } from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ScrollToTop } from '@/components/ui/scroll-to-top';
import { BrandLogo } from '@/components/public/brand-logo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { RoleGuard } from '@/components/auth/role-guard';
import { useAuth } from '@/components/auth/auth-provider';
import { WorkspaceSidebar, type WorkspaceNavItem } from '@/components/ui/workspace-sidebar';

const TECHNICIAN_NAV: WorkspaceNavItem[] = [
  { href: '/technicien', label: 'Vue d’ensemble', icon: 'home' },
  { href: '/technicien/demandes', label: 'Missions', icon: 'wrench' },
  { href: '/technicien/chronologies', label: 'Chronologies', icon: 'clock' },
  { href: '/technicien/historique', label: 'Historique', icon: 'badge-check' },
  { href: '/technicien/revenus', label: 'Revenus', icon: 'briefcase' },
  { href: '/technicien/notifications', label: 'Notifications', icon: 'bell', notifications: true },
  { href: '/technicien/zones', label: 'Zones couvertes', icon: 'pin' },
  /* KYC = page DÉDIÉE (`/technicien/kyc`), distincte du profil : le menu doit
   * y donner accès direct, sinon la vérification reste introuvable. */
  { href: '/technicien/kyc', label: 'Vérification', icon: 'shield-check' },
  { href: '/technicien/profil', label: 'Mon profil', icon: 'user' },
];

const TECHNICIAN_PUBLIC_PATHS = ['/technicien/connexion', '/technicien/inscription', '/technicien/verification'];

/* Chantier #5B — routes « immergées » : le tunnel d'entrée technician prend
 * tout l'écran (cf. `AuthSplit`). */
/* Chantier #5B — routes « immergées » : le tunnel d'entrée technicien prend
 * tout l'écran (cf. `AuthSplit`).
 *
 * La vérification rejoint cette liste : c'est une page d'attente, sans
 * navigation. Elle n'utilise pas la coquille split — sa carte est propre —
 * d'où son exclusion du plein écran plus bas, qui lui garde une largeur de
 * lecture. */
const TECHNICIAN_IMMERSIVE_AUTH_PATHS = [
  '/technicien/inscription',
  '/technicien/connexion',
  '/technicien/verification',
];

export default function TechnicianLayout({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname() ?? '';
  const { user, authenticated, loading } = useAuth();
  const isPublicPath = TECHNICIAN_PUBLIC_PATHS.includes(pathname);
  const showPrivateChrome = authenticated && user?.role === 'TECHNICIAN';
  /* Chantier #5B — connexion ET inscription partagent la coquille immersive
   * `AuthSplit`, qui pose elle-même son logo. Le header global est donc masqué
   * sur ces deux routes : sinon double logo, et un bouton « Se connecter »
   * affiché sur la page de connexion elle-même (le défaut corrigé pour le
   * client au chantier #3). Toutes les AUTRES pages technicien gardent
   * header + sidebar + bottom nav. */
  const isImmersiveAuth = TECHNICIAN_IMMERSIVE_AUTH_PATHS.includes(pathname);
  /* La vérification garde une largeur de lecture : en plein écran, sa carte
   * s'étirerait sur toute la largeur du bureau. */
  const isFullBleedAuth =
    isImmersiveAuth && pathname !== '/technicien/verification';

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      {isImmersiveAuth ? null : (
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo unique : la sidebar latérale affiche déjà le logo sur
            desktop (lg+) — le header ne le répète que sur mobile. */}
          <span className={showPrivateChrome && !isPublicPath ? 'lg:hidden' : undefined}>
            <BrandLogo href={showPrivateChrome ? '/technicien' : '/'} />
          </span>
          <div className="flex items-center gap-2">
            {loading ? (
              <Spinner size="sm" className="border-muted-foreground/30 border-t-muted-foreground" />
            ) : showPrivateChrome ? (
              <UserAvatar href="/technicien/profil" />
            ) : (
              <Link href="/technicien/connexion">
                <Button variant="ghost" size="sm">
                  Se connecter
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
      )}

      <div className={`mx-auto flex w-full flex-1 items-start gap-8 ${isFullBleedAuth ? 'max-w-none px-0 py-0' : `py-6 ${showPrivateChrome ? 'max-w-7xl px-4 sm:px-6 lg:px-8' : 'max-w-lg px-4'}`}`}>
        {showPrivateChrome && !isPublicPath ? (
          <WorkspaceSidebar label="Espace technicien" items={TECHNICIAN_NAV} />
        ) : null}
        <main className="min-w-0 w-full flex-1 overflow-x-clip pb-28 lg:pb-10">
          <div key={pathname} className="animate-slide-up">
            <RoleGuard expectedRole="TECHNICIAN" publicPaths={TECHNICIAN_PUBLIC_PATHS}>
              {children}
            </RoleGuard>
          </div>
        </main>
      </div>

      {showPrivateChrome && !isPublicPath ? (
        <div className="lg:hidden">
          <BottomNav
            items={[
              { href: '/technicien', label: 'Accueil', icon: 'home' },
              { href: '/technicien/demandes', label: 'Missions', icon: 'wrench' },
              { href: '/technicien/chronologies', label: 'Chronologies', icon: 'clock' },
              { href: '/technicien/revenus', label: 'Revenus', icon: 'briefcase' },
            ]}
            /* CHANTIER NAVIGATION P1/P2 — 6 boutons à 360 px = illisible :
             * 4 entrées + « Plus » (notifications, historique, zones,
             * vérification, profil). Aucune route perdue, état actif conservé. */
            moreItems={[
              { href: '/technicien/notifications', label: 'Notifications', icon: 'bell', notifications: true },
              { href: '/technicien/historique', label: 'Historique', icon: 'badge-check' },
              { href: '/technicien/zones', label: 'Zones couvertes', icon: 'pin' },
              { href: '/technicien/kyc', label: 'Vérification', icon: 'shield-check' },
              { href: '/technicien/profil', label: 'Mon profil', icon: 'user' },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
