import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export function ParrainageOverview({ code, copied, onCopy }: { code: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-gradient-from via-[#6d28d9] to-brand-gradient-to p-5 text-white shadow-pop">
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
          <p className="text-xs font-medium uppercase tracking-wider text-white/70">Votre code parrain</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-wider">{code}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
            <Icon name="users" size="3.5" />
            Partagez-le et faites découvrir RepairDom.
          </p>
        </div>
        <span className="flex shrink-0 items-center justify-center rounded-2xl bg-white/20 p-2 text-white shadow-float">
          <Icon name="users" size="lg" />
        </span>
      </div>

      <div className="relative mt-4">
        <Button
          variant="secondary"
          size="lg"
          onClick={onCopy}
          className="w-full gap-2 bg-white/20 text-white hover:bg-white/30"
        >
          <Icon name="check" size="md" />
          {copied ? 'Code copié !' : 'Copier mon code'}
        </Button>
      </div>
    </div>
  );
}