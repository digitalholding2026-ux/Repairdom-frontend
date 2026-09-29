'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';
import { Modal } from './modal';
import { NotificationTabBadge } from '@/components/notifications/notification-tab-badge';

export interface BottomNavItem {
  href: string;
  label: string;
  icon: IconName;
  notifications?: boolean;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  primaryHref?: { href: string; label: string; icon: IconName };
  /* CHANTIER NAVIGATION P1/P2 — entrées secondaires (sections desktop
   * absentes de la barre à 360 px) : bouton « Plus » + bottom-sheet,
   * aucun bouton minuscule, aucun doublon avec `items`. */
  moreItems?: BottomNavItem[];
  className?: string;
}

/**
 * Barre de navigation inférieure épurée (modèle Neero, charte Relio).
 * Fixée en bas de l'écran mobile, fond blanc flouté, onglet actif en
 * orange. Règle d'activation stricte : correspondance exacte pour
 * l'onglet d'accueil (sinon `/client` resterait actif sur toutes les
 * pages), préfixe de segment pour les autres onglets (les sous-routes
 * comme `/client/solde/recharger` gardent leur onglet actif).
 * Avec un `primaryHref`, une action centrale surélevée organise les
 * onglets en 2 + FAB + 2.
 */
export function BottomNav({ items, primaryHref, moreItems, className }: BottomNavProps) {
  const pathname = usePathname() ?? '';
  const [moreOpen, setMoreOpen] = useState(false);
  const normalize = (href: string) => (href.length > 1 ? href.replace(/\/+$/, '') : href);
  const isActive = (href: string) => {
    const target = normalize(href);
    if (target === '/' || target === '/client' || target === '/technicien') return pathname === target;
    return pathname === target || pathname.startsWith(`${target}/`);
  };
  const split = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, split);
  const rightItems = items.slice(split);
  const moreActive = (moreItems ?? []).some((item) => isActive(item.href));

  return (
    <>
    <nav
      aria-label="Navigation principale"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {primaryHref ? (
          <>
            <span className="flex flex-1 items-center justify-around gap-1">
              {leftItems.map((item) => (
                <BottomNavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </span>
            <span className="flex justify-center px-2">
              <Link
                href={primaryHref.href}
                aria-label={primaryHref.label}
                className="flex size-14 -translate-y-4 items-center justify-center rounded-full bg-orange-500/90 text-white shadow-lg shadow-orange-500/20 backdrop-blur-sm transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 hover:scale-105 hover:bg-orange-500 active:scale-95"
              >
                <Icon name={primaryHref.icon} size="lg" strokeWidth={2.2} />
              </Link>
            </span>
            <span className="flex flex-1 items-center justify-around gap-1">
              {rightItems.map((item) => (
                <BottomNavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </span>
          </>
        ) : (
          [...items, ...(moreItems?.length ? [{ href: '__more', label: 'Plus', icon: 'menu' as IconName }] : [])].map(
            (item) =>
              item.href === '__more' ? (
                <button
                  key="__more"
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  aria-expanded={moreOpen}
                  aria-label="Plus de sections"
                  className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-0.5 text-2xs font-medium transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-95"
                >
                  <span className="relative flex items-center justify-center">
                    <Icon
                      name="menu"
                      size="md"
                      strokeWidth={moreActive ? 2.4 : 1.9}
                      className={cn(
                        'transition-all duration-300',
                        moreActive ? 'scale-110 text-orange-500' : 'text-slate-400 hover:text-slate-600',
                      )}
                    />
                    {(moreItems ?? []).some((entry) => entry.notifications) ? (
                      <NotificationTabBadge />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'max-w-full truncate leading-none transition-colors duration-300',
                      moreActive ? 'font-semibold text-orange-500' : 'text-slate-400',
                    )}
                  >
                    Plus
                  </span>
                </button>
              ) : (
                <BottomNavLink key={item.href} item={item} active={isActive(item.href)} />
              ),
          )
        )}
      </div>
    </nav>
      {moreItems?.length ? (
        <Modal
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          title="Plus de sections"
          sheet
        >
          <nav className="space-y-1" aria-label="Sections secondaires">
            {moreItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
                    active
                      ? 'bg-orange-500/10 font-semibold text-orange-600'
                      : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <span className="relative flex size-5 shrink-0 items-center justify-center">
                    <Icon name={item.icon} size="sm" />
                    {item.notifications ? <NotificationTabBadge /> : null}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </Modal>
      ) : null}
    </>
  );
}

function BottomNavLink({ item, active }: { item: BottomNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-0.5 text-2xs font-medium transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-95"
    >
      <span className="relative flex items-center justify-center">
        <Icon
          name={item.icon}
          size="md"
          strokeWidth={active ? 2.4 : 1.9}
          className={cn(
            'transition-all duration-300',
            active ? 'scale-110 text-orange-500' : 'text-slate-400 hover:text-slate-600',
          )}
        />
        {item.notifications ? <NotificationTabBadge /> : null}
      </span>
      <span
        className={cn(
          'max-w-full truncate leading-none transition-colors duration-300',
          active ? 'font-semibold text-orange-500' : 'text-slate-400',
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
