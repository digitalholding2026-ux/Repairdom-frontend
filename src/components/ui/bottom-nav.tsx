'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';
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
  className?: string;
}

/**
 * Barre de navigation inférieure épurée (modèle Neero, charte Relio).
 * Fixée en bas de l'écran mobile, fond blanc flouté, onglet actif en
 * orange Relio (#FF6B00). Avec un `primaryHref`, une action centrale
 * surélevée organise les onglets en 2 + FAB + 2.
 */
export function BottomNav({ items, primaryHref, className }: BottomNavProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const split = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, split);
  const rightItems = items.slice(split);

  return (
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
                className="flex size-14 -translate-y-4 items-center justify-center rounded-full bg-[#FF6B00] text-white shadow-lg shadow-orange-500/30 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 hover:scale-105 active:scale-95"
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
          items.map((item) => (
            <BottomNavLink key={item.href} item={item} active={isActive(item.href)} />
          ))
        )}
      </div>
    </nav>
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
            active ? 'scale-110 text-[#FF6B00]' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400',
          )}
        />
        {item.notifications ? <NotificationTabBadge /> : null}
      </span>
      <span
        className={cn(
          'max-w-full truncate leading-none transition-colors duration-300',
          active ? 'font-semibold text-[#FF6B00]' : 'text-slate-500 dark:text-slate-400',
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}
