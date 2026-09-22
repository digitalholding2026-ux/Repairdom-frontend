import { Icon } from '@/components/ui/icon';

export function UpcomingBanner() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon name="plus" size="md" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Recharger mon solde</p>
        <p className="text-xs text-muted-foreground">
          Les recharges et retraits seront disponibles prochainement.
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-2xs font-medium text-muted-foreground">
        À venir
      </span>
    </div>
  );
}