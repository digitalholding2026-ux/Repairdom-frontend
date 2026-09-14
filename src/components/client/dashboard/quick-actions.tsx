import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';

const ACTIONS: Array<{ label: string; href: string; icon: IconName; color: string }> = [
  {
    label: 'Récompenses',
    href: '/client/recompenses',
    icon: 'sparkles',
    color: 'bg-warning-soft text-warning-ink',
  },
  {
    label: 'Parrainage',
    href: '/client/parrainage',
    icon: 'users',
    color: 'bg-accent/10 text-accent',
  },
  {
    label: 'Historique',
    href: '/client/demandes/historique',
    icon: 'clock',
    color: 'bg-info-soft text-info-ink',
  },
  {
    label: 'Notifications',
    href: '/client/notifications',
    icon: 'bell',
    color: 'bg-primary/10 text-primary',
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2 transition-transform active:scale-95"
        >
          <span
            className={`flex size-11 items-center justify-center rounded-2xl shadow-card transition-transform group-hover:scale-105 ${action.color}`}
          >
            <Icon name={action.icon} size="md" strokeWidth={1.9} />
          </span>
          <span className="text-center text-[0.65rem] font-medium leading-tight text-muted-foreground">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  );
}