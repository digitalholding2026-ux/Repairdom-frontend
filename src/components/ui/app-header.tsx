import type { ReactNode } from 'react';
import { Button } from './button';
import { Icon } from './icon';

/* Phase B — hero dashboard commun : titre + sous-titre + déconnexion.
 * Unifie les 3 implémentations recodées (dashboard client home + liste/historique,
 * dashboard technicien). Les cas CRUD (retour + titre + actions) restent
 * couverts par `PageHeader`. */
export function DashboardHero({
  title,
  subtitle,
  onLogout,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle ? <p className="break-words text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <Button variant="ghost" size="sm" onClick={onLogout} className="shrink-0">
        <Icon name="logout" size="sm" />
        <span className="ml-1 hidden sm:inline">Déconnexion</span>
      </Button>
    </div>
  );
}
