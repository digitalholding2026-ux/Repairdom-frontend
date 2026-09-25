import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';

const ACTIONS: Array<{ label: string; href: string; icon: IconName; color: string }> = [
  {
    label: 'Disponibilité',
    href: '#disponibilite',
    icon: 'shield-check',
    color: 'bg-success-soft text-success-ink',
  },
  {
    label: 'Nouvelles demandes',
    href: '/technicien/demandes',
    icon: 'search',
    color: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
  },
  {
    label: 'Chronologies',
    href: '/technicien/chronologies',
    icon: 'clock',
    color: 'bg-info-soft text-info-ink',
  },
  {
    label: 'Historique',
    href: '/technicien/historique',
    icon: 'badge-check',
    color: 'bg-warning-soft text-warning-ink',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ACTIONS.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition-transform active:scale-95"
        >
          <span
            className={`flex size-11 items-center justify-center rounded-2xl shadow-card transition-transform group-hover:scale-105 ${action.color}`}
          >
            <Icon name={action.icon} size="md" strokeWidth={1.9} />
          </span>
          <span className="text-center text-2xs font-medium leading-tight text-muted-foreground">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
