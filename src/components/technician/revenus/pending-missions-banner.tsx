import Link from 'next/link';
import { Icon } from '@/components/ui/icon';

export function PendingMissionsBanner({
  count,
  href,
}: {
  count: number;
  href: string;
}) {
  if (count <= 0) return null;

  return (
    <Link href={href} className="block active:scale-[0.99] transition-transform">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-card">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-ink">
          <Icon name="clock" size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {count} intervention{count !== 1 ? 's' : ''} en cours
          </p>
          <p className="text-xs text-muted-foreground">
            Elles seront comptabilisées une fois confirmées par le client.
          </p>
        </div>
        <span className="shrink-0 text-primary">
          <Icon name="chevron-right" size="sm" />
        </span>
      </div>
    </Link>
  );
}