'use client';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

/* IA-9 — pagination partagée des onglets IA (même contrat que les listes
 * inline existantes : total/pages/page/setPage, boutons tactiles). */
export function AiPagination({
  total,
  pages,
  page,
  setPage,
}: {
  total: number;
  pages: number;
  page: number;
  setPage: (page: number) => void;
}) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {total} signal{total !== 1 ? 'aux' : ''} · page {page} / {pages}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Page précédente"
        >
          <Icon name="chevron-left" size="sm" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
          aria-label="Page suivante"
        >
          <Icon name="chevron-right" size="sm" />
        </Button>
      </div>
    </div>
  );
}
