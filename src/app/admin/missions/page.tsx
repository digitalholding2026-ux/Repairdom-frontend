'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { DemandeStatusBadge, QuoteStatusBadge } from '@/components/ui/status-badge';
import { MissionTimeline } from '@/components/mission/mission-timeline';
import {
  getAdminMissionByReference,
  type SupervisedMission,
} from '@/lib/api/admin-service';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { categoryLabel } from '@/lib/technician-profile';
import { AdminInfoRow } from '@/components/admin/info-row';
import { MissionDetailSkeleton } from '@/components/admin/missions/mission-detail-skeleton';

function DeviceContext({ mission }: { mission: SupervisedMission }) {
  const device = mission.device;
  const parts: string[] = [];
  if (device.brand) parts.push(`Marque : ${device.brand.name}`);
  if (device.model) parts.push(`Modèle : ${device.model.name}`);
  if (device.problem) parts.push(`Problème : ${device.problem.name}`);

  return (
    <>
      <AdminInfoRow
        label="Appareil"
        value={device.domain?.name ?? 'Non précisé'}
      />
      {parts.length > 0 ? (
        <div className="space-y-1">
          {parts.map((part) => (
            <p key={part} className="text-sm text-muted-foreground">{part}</p>
          ))}
        </div>
      ) : null}
    </>
  );
}

export default function AdminMissionsPage() {
  const [reference, setReference] = useState('');
  const [mission, setMission] = useState<SupervisedMission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = async () => {
    const ref = reference.trim();
    if (!ref) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setMission(null);
    try {
      const data = await getAdminMissionByReference(ref);
      setMission(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de recherche.';
      setNotFound(message.includes('introuvable'));
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Missions"
        description="Recherchez une mission par sa référence (RD-XXXXXX)."
        backHref="/admin"
      />

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex gap-2">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Ex. : RD-AB12CD"
              className="uppercase"
              maxLength={20}
            />
            <Button onClick={handleSearch} isLoading={loading} className="shrink-0">
              <Icon name="search" size="sm" />
              Rechercher
            </Button>
          </div>
          {error ? (
            <Alert variant={notFound ? 'info' : 'error'}>
              {notFound ? 'Mission introuvable.' : error}
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      {loading ? (
        <MissionDetailSkeleton />
      ) : mission ? (
        <div className="space-y-5">
          <section className="space-y-3">
            <SectionHeader
              title="Mission"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-primary">{mission.reference}</span>
                  <DemandeStatusBadge status={mission.status} />
                  {mission.technician?.kycVerified ? (
                    <span className="text-xs text-muted-foreground">KYC validé</span>
                  ) : null}
                </div>
              }
            />
            <Card>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <AdminInfoRow label="Catégorie" value={categoryLabel(mission.category)} />
                  {mission.finalAmount != null ? (
                    <AdminInfoRow label="Montant final accepté" value={formatCurrency(mission.finalAmount)} />
                  ) : null}
                </div>
                {mission.description ? <AdminInfoRow label="Description" value={mission.description} /> : null}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Matériel et lieu" icon="wrench" />
            <Card>
              <CardContent className="space-y-3">
                <DeviceContext mission={mission} />
                <div className="grid grid-cols-2 gap-3">
                  <AdminInfoRow label="Ville" value={mission.contact.city} />
                  <AdminInfoRow label="Quartier" value={mission.contact.neighborhood ?? '—'} />
                  <AdminInfoRow label="Adresse" value={mission.contact.address ?? '—'} />
                  <AdminInfoRow label="Repère" value={mission.contact.landmark ?? '—'} />
                </div>
                {mission.contact.contactPhone ? (
                  <AdminInfoRow label="Téléphone de contact" value={mission.contact.contactPhone} />
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Client et technicien" icon="users" />
            <Card>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <AdminInfoRow
                    label="Client"
                    value={mission.client
                      ? `${mission.client.firstName} ${mission.client.lastName ?? ''}`.trim()
                      : '—'}
                  />
                  <AdminInfoRow
                    label="Téléphone client"
                    value={mission.client?.phone ?? '—'}
                  />
                  <AdminInfoRow
                    label="Technicien"
                    value={mission.technician
                      ? `${mission.technician.firstName} ${mission.technician.lastName ?? ''}`.trim()
                      : 'Aucun technicien assigné'}
                  />
                  <AdminInfoRow label="Téléphone technicien" value={mission.technician?.phone ?? '—'} />
                </div>
                {mission.technician ? (
                  <AdminInfoRow
                    label="Ville du technicien"
                    value={mission.technician.city ?? '—'}
                  />
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <SectionHeader title="Planification" icon="calendar" />
            <Card>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <AdminInfoRow
                    label="Mode de demande"
                    value={mission.request.requestedMode}
                  />
                  <AdminInfoRow
                    label="Rendez-vous"
                    value={mission.request.scheduledAt
                      ? formatDateTime(mission.request.scheduledAt)
                      : '—'}
                  />
                </div>
                {mission.request.requestedAt ? (
                  <AdminInfoRow label="Demandé le" value={formatDateTime(mission.request.requestedAt)} />
                ) : null}
              </CardContent>
            </Card>
          </section>

          {mission.quotes.length > 0 ? (
            <section className="space-y-3">
              <SectionHeader
                title={`Tarifs (${mission.quotes.length})`}
                icon="file"
              />
              <Card>
                <CardContent className="space-y-4">
                  {mission.quotes.map((quote) => (
                    <div key={quote.id} className="space-y-2 rounded-lg border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{formatCurrency(quote.amount)}</p>
                          <QuoteStatusBadge status={quote.status} />
                          {quote.source === 'CATALOG' ? (
                            <span className="text-xs text-muted-foreground">catalogue</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(quote.createdAt)}
                        </p>
                      </div>
                      {quote.breakdown ? (
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <span>Réparation : {formatCurrency(quote.breakdown.referencePrice)}</span>
                          <span>Déplacement : {formatCurrency(quote.breakdown.travelFee)}</span>
                          <span>Frais service : {formatCurrency(quote.breakdown.serviceFee)}</span>
                        </div>
                      ) : null}
                      {quote.description ? (
                        <p className="text-sm text-muted-foreground">{quote.description}</p>
                      ) : null}
                      {quote.technician ? (
                        <p className="text-xs text-muted-foreground">
                          Proposé par : {quote.technician.firstName} {quote.technician.lastName ?? ''}
                          {quote.catalogIntervention ? ` — ${quote.catalogIntervention.name}` : ''}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {mission.diagnostics.length > 0 ? (
            <section className="space-y-3">
              <SectionHeader
                title={`Diagnostics (${mission.diagnostics.length})`}
                icon="search"
              />
              <Card>
                <CardContent className="space-y-3">
                  {mission.diagnostics.map((diag) => (
                    <div key={diag.id} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">
                        {diag.catalogDiagnostic?.name ?? diag.content}
                      </p>
                      {diag.catalogIntervention ? (
                        <p className="text-xs text-muted-foreground">
                          Intervention : {diag.catalogIntervention.name}
                        </p>
                      ) : null}
                      {diag.proposedIntervention ? (
                        <p className="text-xs text-muted-foreground">
                          Proposition : {diag.proposedIntervention}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {diag.technician
                          ? `${diag.technician.firstName} ${diag.technician.lastName ?? ''}`.trim()
                          : ''}
                        {' '}— {formatDateTime(diag.createdAt)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          ) : null}

          {mission.events.length > 0 ? (
            <section className="space-y-3">
              <SectionHeader title="Chronologie" icon="clock" />
              <Card>
                <CardContent>
                  <MissionTimeline events={mission.events} />
                </CardContent>
              </Card>
            </section>
          ) : null}
        </div>
      ) : error && !notFound ? (
        <EmptyState
          icon="search"
          title="Recherche impossible"
          description="Vérifiez la référence saisie et réessayez."
        />
      ) : (
        <EmptyState
          icon="search"
          title="Recherche de mission"
          description="Saisissez la référence RD-XXXXXX d'une mission pour consulter sa supervision."
        />
      )}
    </div>
  );
}