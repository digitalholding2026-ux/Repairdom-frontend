'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icon';
import { BrandLogo } from '@/components/public/brand-logo';
import { NotificationTabBadge } from '@/components/notifications/notification-tab-badge';

export interface WorkspaceNavItem {
  href: string;
  label: string;
  icon: IconName;
  notifications?: boolean;
}

export function WorkspaceSidebar({
  label,
  items,
  action,
}: {
  label: string;
  items: WorkspaceNavItem[];
  action?: { href: string; label: string; icon: IconName };
}) {
  const pathname = usePathname() ?? '';

  return (
    <aside className="sticky top-20 hidden w-60 shrink-0 lg:block" aria-label={`Navigation ${label}`}>
      <div className="rounded-2xl border border-border bg-card p-2 shadow-card">
        <div className="flex justify-center px-3 pb-1 pt-3">
          <BrandLogo href={items[0]?.href ?? '/'} />
        </div>
        <p className="px-3 pb-2 pt-2 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <nav className="space-y-1">
          {items.map((item) => {
            const hasNestedRoute = item.href.split('/').filter(Boolean).length > 1;
            const active = pathname === item.href || (hasNestedRoute && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
        {action ? (
          <Link
            href={action.href}
            className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Icon name={action.icon} size="sm" />
            {action.label}
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
