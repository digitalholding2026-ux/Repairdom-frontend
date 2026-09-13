import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';

const ACTIONS: Array<{ label: string; href: string; icon: IconName }> = [
  { label: 'Historique', href: '/technicien/historique', icon: 'clock' },
  { label: 'Revenus', href: '/technicien/revenus', icon: 'briefcase' },
  { label: 'Notifications', href: '/technicien/notifications', icon: 'bell' },
  { label: 'Profil', href: '/technicien/profil', icon: 'user' },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="group flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 transition-transform active:scale-95"
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-card transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon name={action.icon} size="md" strokeWidth={1.9} />
          </span>
          <span className="text-[0.7rem] font-medium text-muted-foreground">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}