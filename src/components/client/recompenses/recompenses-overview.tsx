import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

const REWARD_TARGET = 5;

export function RecompensesOverview({ completedCount }: { completedCount: number }) {
  const progress = Math.min(completedCount / REWARD_TARGET, 1);
  const remaining = Math.max(REWARD_TARGET - completedCount, 0);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-gradient-from via-brand-gradient-via to-brand-gradient-to p-5 text-white shadow-pop">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">
            Programme fidélité
          </p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-tight">
            {completedCount} / {REWARD_TARGET}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
            <Icon name="check-circle" size="3.5" />
            dépannages terminés
          </p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
          <Icon name="sparkles" size="lg" />
        </span>
      </div>

      <div className="relative mt-4 space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="text-xs text-white/70">
          {remaining === 0
            ? 'Félicitations, objectif atteint !'
            : `${remaining} dépannage${remaining !== 1 ? 's' : ''} avant votre prochaine récompense.`}
        </p>
      </div>

      <Link
        href="/client/demandes/historique"
        className="relative mt-3 flex items-center justify-end gap-1 text-xs font-medium text-white/80 hover:text-white"
      >
        Voir mes missions terminées
        <Icon name="chevron-right" size="sm" />
      </Link>
    </div>
  );
}

export function RecompensesPlaceholder() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon name="star" size="lg" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">Programme bientôt disponible</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Les récompenses seront débloquées après 5 dépannages validés. Restez connecté !
        </p>
      </div>
      <Link href="/client/demandes" className="block">
        <Button variant="secondary" className="w-full">
          Déposer une demande
        </Button>
      </Link>
    </div>
  );
}