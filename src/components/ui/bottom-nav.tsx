'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';

export interface BottomNavItem {
  href: string;
  label: string;
  icon: IconName;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  primaryHref?: { href: string; label: string; icon: IconName };
  className?: string;
}

export function BottomNav({ items, primaryHref, className }: BottomNavProps) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        'safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto grid w-full max-w-lg px-2 pb-1 pt-1.5',
          primaryHref ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-2',
        )}
      >
        {items.slice(0, 1).map((item) => (
          <BottomNavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
        <span className="flex justify-center">
          {primaryHref ? (
            <Link
              href={primaryHref.href}
              aria-label={primaryHref.label}
              className="flex size-14 -translate-y-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform hover:scale-105 active:scale-95"
            >
              <Icon name={primaryHref.icon} className="size-6" strokeWidth={2.2} />
            </Link>
          ) : null}
        </span>
        {items.slice(1).map((item) => (
          <BottomNavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </div>
    </nav>
  );
}

function BottomNavLink({ item, active }: { item: BottomNavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 px-2 text-[11px] font-medium transition-colors',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon name={item.icon} className="size-5" strokeWidth={active ? 2.3 : 1.8} />
      {item.label}
    </Link>
  );
}