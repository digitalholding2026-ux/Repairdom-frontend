import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Icon } from './icon';

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Fil d'Ariane (Sprint 8.6.5) : navigation hiérarchique du catalogue admin,
 * ex. Catalogue → Domaine → Marque → Modèle → Problème. */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const visible = items.filter((item) => item.label !== undefined && item.label !== null);
  if (visible.length === 0) return null;

  return (
    <nav aria-label="Fil d'Ariane" className={cn('flex items-center gap-1.5', className)}>
      {visible.map((item, index) => {
        const isLast = index === visible.length - 1;
        const content = isLast ? (
          <span className="truncate text-sm font-semibold text-foreground">{item.label}</span>
        ) : item.href ? (
          <Link
            href={item.href}
            className="shrink-0 truncate text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {item.label}
          </Link>
        ) : (
          <span className="shrink-0 truncate text-sm text-muted-foreground">{item.label}</span>
        );

        return (
          <span key={index} className="flex min-w-0 items-center gap-1.5">
            {content}
            {!isLast ? (
              <Icon name="chevron-right" size="sm" className="shrink-0 text-muted-foreground/60" />
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}