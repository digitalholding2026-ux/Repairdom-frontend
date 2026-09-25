import Link from 'next/link';
import { cn } from '@/lib/cn';

/* Phase B — onglets partagés : unifie les 3 implémentations ad hoc
 * (MissionTabs client en liens, ChronologiesView segmenté à état local,
 * statuts KYC admin en pilules). Deux variantes visuelles, deux modes
 * (liens de navigation ou boutons à état). */

export interface TabItem {
  id: string;
  label: string;
  /** Si fourni, l'onglet est un lien de navigation ; sinon un bouton. */
  href?: string;
}

export interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onChange?: (id: string) => void;
  variant?: 'pills' | 'segmented';
  label: string;
  className?: string;
}

export function Tabs({ items, value, onChange, variant = 'pills', label, className }: TabsProps) {
  /* UI-6 : lorsque tous les onglets sont des liens, c'est une navigation —
   * pas des tabs (pas de `role=tab` artificiel, `aria-current` suffit). */
  if (items.length > 0 && items.every((item) => item.href)) {
    return (
      <nav
        aria-label={label}
        className={cn(
          variant === 'segmented'
            ? 'flex items-center gap-1 rounded-xl border border-border bg-card p-1'
            : 'flex items-center gap-2 overflow-x-auto no-scrollbar',
          className,
        )}
      >
        {items.map((item) => {
          const active = item.id === value;
          return (
            <Link
              key={item.id}
              href={item.href as string}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                variant === 'segmented' ? 'flex-1 rounded-lg px-3 py-2 text-center' : 'shrink-0 rounded-full px-3.5 py-2',
                active
                  ? 'bg-primary text-primary-foreground'
                  : variant === 'segmented'
                    ? 'text-muted-foreground hover:text-foreground'
                    : 'bg-secondary text-secondary-foreground hover:opacity-90',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        variant === 'segmented'
          ? 'flex items-center gap-1 rounded-xl border border-border bg-card p-1'
          : 'flex items-center gap-2 overflow-x-auto no-scrollbar',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        const tabClassName = cn(
          'text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          variant === 'segmented' ? 'flex-1 rounded-lg px-3 py-2' : 'shrink-0 rounded-full px-3.5 py-2',
          active
            ? 'bg-primary text-primary-foreground'
            : variant === 'segmented'
              ? 'text-muted-foreground hover:text-foreground'
              : 'bg-secondary text-secondary-foreground hover:opacity-90',
        );
        return item.href ? (
          /* Cas mixte résiduel : un lien n'est jamais un tab. */
          <Link key={item.id} href={item.href} aria-current={active ? 'page' : undefined} className={tabClassName}>
            {item.label}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.id)}
            className={tabClassName}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
