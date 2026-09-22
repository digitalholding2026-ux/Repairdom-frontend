'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { formatDate } from '@/lib/format';
import {
  getAdminKycFolders,
  type AdminKycFolder,
} from '@/lib/api/admin-service';
import { categoryLabel, kycStatusLabel, kycVariantFor } from '@/lib/technician-profile';
import { KycListSkeleton } from '@/components/admin/kyc/kyc-list-skeleton';

const STATUS_TABS = [
  { id: 'PENDING', label: 'En attente' },
  { id: 'VERIFIED', label: 'Vérifiés' },
  { id: 'REJECTED', label: 'Rejetés' },
] as const;

export default function AdminKycPage() {
  const [status, setStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [folders, setFolders] = useState<AdminKycFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    getAdminKycFolders(status)
      .then((result) => {
        if (!cancelled) setFolders(result.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, reloadKey]);


  return (
    <div className="space-y-5">
      <PageHeader
        title="Vérifications KYC"
        description="Examinez les identités des techniciens inscrits."
      />

      <section className="space-y-3" aria-label="Statuts des dossiers">
        <Tabs
          label="Statuts des dossiers"
          value={status}
          onChange={(id) => setStatus(id as 'PENDING' | 'VERIFIED' | 'REJECTED')}
          items={STATUS_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        />

        {loading ? (
          <KycListSkeleton />
        ) : error ? (
          <EmptyState
            title="Impossible de charger les dossiers"
            description={error}
            action={
              <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
                Réessayer
              </Button>
            }
          />
        ) : folders.length === 0 ? (
          <EmptyState
            icon={<Icon name="shield-check" size="md" />}
            title="Aucun dossier"
            description={`Aucun dossier ${STATUS_TABS.find((t) => t.id === status)?.label.toLowerCase()} pour le moment.`}
          />
        ) : (
          <div className="space-y-3">
            {folders.map((folder) => (
              <Link key={folder.technicianId} href={`/admin/kyc/${folder.technicianId}`} className="block">
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {folder.firstName}
                          {folder.lastName ? ` ${folder.lastName}` : ''}
                        </p>
                        {folder.city ? (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Icon name="pin" size="3.5" />
                            {folder.city}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant={kycVariantFor(folder.kycStatus)}>
                        {kycStatusLabel(folder.kycStatus)}
                      </Badge>
                    </div>
                    {folder.categories.length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {folder.categories.map(categoryLabel).join(' · ')}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-muted-foreground">
                        {folder.documentCount} document{folder.documentCount !== 1 ? 's' : ''} · Soumis le {formatDate(folder.submittedAt)}
                      </p>
                      <Button variant="secondary" size="sm" className="shrink-0">
                        Examiner
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}