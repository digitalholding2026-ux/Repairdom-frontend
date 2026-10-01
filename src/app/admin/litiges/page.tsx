'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { ResponsiveView } from '@/components/ui/responsive-view';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { AiPagination } from '@/components/admin/ai/ai-pagination';
import { formatDate, fullName } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { DISPUTE_STATUSES, disputeCategoryLabel, disputeStatusConfig } from '@/lib/dispute-status';
import {
  listAdminDisputes,
  type AdminDispute,
} from '@/lib/api/admin-service';

const PAGE_LIMIT = 20;

export default function AdminLitigesPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminDispute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAdminDisputes({ status: status || undefined, page, limit: PAGE_LIMIT })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, page, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const mobile = (
    <div className="space-y-3">
      {items.map((dispute) => {
        const config = disputeStatusConfig(dispute.status);
        return (
          <Link key={dispute.id} href={`/admin/litiges/${dispute.id}`} className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-mono text-sm font-semibold text-primary">
                    {dispute.demande?.reference ?? dispute.demandeId}
                  </p>
                  <Badge variant={config.variant}>{config.label}</Badge>
                </div>
                <p className="text-sm">
                  {disputeCategoryLabel(dispute.category)}
                  {dispute.openedBy ? (
                    <span className="text-muted-foreground">
                      {' '}· {fullName(dispute.openedBy.firstName, dispute.openedBy.lastName)}
                    </span>
                  ) : null}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{dispute.description}</p>
                <p className="text-xs text-muted-foreground">Ouvert le {formatDate(dispute.createdAt)}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );

  const desktop = (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">Mission</th>
                <th scope="col" className="px-4 py-3 font-medium">Motif</th>
                <th scope="col" className="px-4 py-3 font-medium">Ouvert par</th>
                <th scope="col" className="px-4 py-3 font-medium">Statut</th>
                <th scope="col" className="px-4 py-3 font-medium">Ouvert le</th>
                <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((dispute) => {
                const config = disputeStatusConfig(dispute.status);
                return (
                  <tr key={dispute.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono font-semibold text-primary">
                      {dispute.demande?.reference ?? dispute.demandeId}
                    </td>
                    <td className="px-4 py-3">{disputeCategoryLabel(dispute.category)}</td>
                    <td className="px-4 py-3">
                      {dispute.openedBy
                        ? fullName(dispute.openedBy.firstName, dispute.openedBy.lastName)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(dispute.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/litiges/${dispute.id}`}>
                        <Button variant="secondary" size="sm">Examiner</Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Litiges"
        description="Contestations post-intervention : examinez et tranchez. Un litige fondé libère les fonds, un litige rejeté rouvre la confirmation."
      />

      <Field htmlFor="litige-status" label="Statut">
        <Select
          id="litige-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Tous</option>
          {DISPUTE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {disputeStatusConfig(value).label}
            </option>
          ))}
        </Select>
      </Field>

      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <EmptyState
          title="Impossible de charger les litiges"
          description={error}
          action={
            <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
              Réessayer
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Icon name="alert" size="md" />}
          title="Aucun litige"
          description="Aucun litige pour ce filtre pour le moment."
        />
      ) : (
        <div className="space-y-3">
          <ResponsiveView mobile={mobile} desktop={desktop} fallback={<SkeletonCard />} />
          <AiPagination total={total} pages={pages} page={page} setPage={setPage} />
        </div>
      )}
    </div>
  );
}
