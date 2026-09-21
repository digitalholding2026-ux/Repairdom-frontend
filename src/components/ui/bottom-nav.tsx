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
 * Barre de navigation flottante (« floating pill bar »).
 * Avec un `primaryHref`, l'action centrale surélevée organise les onglets en 2 + FAB + 2.
 * Sans lui, les onglets sont uniformément répartis et centrés.
 */
export function BottomNav({ items, primaryHref, className }: BottomNavProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const split = Math.ceil(items.length / 2);
  const leftItems = items.slice(0, split);
  const rightItems = items.slice(split);
  const gridCols = primaryHref
    ? 'grid-cols-[1fr_auto_1fr]'
    : items.length > 4
      ? 'grid-cols-5'
      : 'grid-cols-4';

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto w-full max-w-lg rounded-2xl border border-border bg-card/90 shadow-float backdrop-blur',
          primaryHref
            ? 'grid grid-cols-[1fr_auto_1fr] items-center px-2 py-1.5'
            : 'grid items-center px-1 py-1.5',
          gridCols,
        )}
      >
        {primaryHref ? (
          <>
            <span className="flex items-center justify-around gap-1">
              {leftItems.map((item) => (
                <BottomNavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
            </span>
            <span className="flex justify-center">
              <Link
                href={primaryHref.href}
                aria-label={primaryHref.label}
                className="flex size-14 -translate-y-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:scale-105 active:scale-95"
              >
                <Icon name={primaryHref.icon} size="lg" strokeWidth={2.2} />
              </Link>
            </span>
            <span className="flex items-center justify-around gap-1">
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
      className="flex flex-col items-center justify-center gap-0.5 rounded-xl py-0.5 text-[10px] font-medium transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
    >
      <span
        className={cn(
          'relative flex h-7 items-center justify-center rounded-full transition-all duration-300',
          active ? 'bg-primary/10 px-4 text-primary' : 'px-2 text-muted-foreground hover:text-foreground',
        )}
      >
        <Icon
          name={item.icon}
          size="md"
          strokeWidth={active ? 2.4 : 1.9}
          className={cn('transition-transform duration-300', active && 'scale-110')}
        />
        {item.notifications ? <NotificationTabBadge /> : null}
      </span>
      <span
        className={cn(
          'max-w-full truncate leading-none transition-colors duration-300',
          active ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}