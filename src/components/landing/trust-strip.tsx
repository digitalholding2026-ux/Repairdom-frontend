import { Icon, type IconName } from '@/components/ui/icon';
import { Marquee } from './marquee';

const TRUST_ITEMS: Array<{ icon: IconName; label: string }> = [
  { icon: 'check-circle', label: 'Devis avant intervention' },
  { icon: 'badge-check', label: 'Techniciens vérifiés' },
  { icon: 'shield-check', label: 'Paiement sécurisé' },
  { icon: 'clock', label: 'Rendez-vous à l\u2019heure' },
  { icon: 'truck', label: 'Suivi en direct' },
  { icon: 'star', label: 'Avis des deux côtés' },
];

export function TrustStrip() {
  const pills = TRUST_ITEMS.map((item) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-muted-foreground">
      <Icon name={item.icon} size="sm" className="text-primary" />
      {item.label}
    </span>
  ));

  return (
    <div className="mt-10" aria-hidden>
      <Marquee items={pills} reverse duration={34} itemClassName="px-4" />
    </div>
  );
}