'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getAdminKycFolder,
  getAdminKycDocumentUrl,
  updateAdminKycStatus,
  type AdminKycDetail,
} from '@/lib/api/admin-service';
import {
  categoryLabel,
  kycStatusLabel,
  kycVariantFor,
  kycDocumentTypeLabel,
  technicianInitials,
} from '@/lib/technician-profile';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export default function AdminKycFolderPage() {
  const params = useParams<{ technicianId: string }>();
  const [detail, setDetail] = useState<AdminKycDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [fetchingUrlId, setFetchingUrlId] = useState<string | null>(null);

  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  async function load(quiet = false) {
    if (!params?.technicianId) return;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const folder = await getAdminKycFolder(params.technicianId);
      setDetail(folder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.technicianId]);

  const handleOpenDocument = async (documentId: string) => {
    if (!params?.technicianId) return;
    setFetchingUrlId(documentId);
    setActionError(null);
    try {
      const result = await getAdminKycDocumentUrl(params.technicianId, documentId);
      setDocumentUrls((prev) => ({ ...prev, [documentId]: result.url }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la récupération du document.');
    } finally {
      setFetchingUrlId(null);
    }
  };

  const handleValidate = async () => {
    if (!params?.technicianId) return;
    if (!window.confirm('Valider le profil de ce technicien ?')) return;
    setActionBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const folder = await updateAdminKycStatus(params.technicianId, 'VERIFIED');
      setDetail(folder);
      setActionSuccess('Profil validé. Le statut du technicien est désormais VERIFIED.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la validation.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async () => {
    if (!params?.technicianId) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setActionError('Le motif de rejet est requis.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const folder = await updateAdminKycStatus(params.technicianId, 'REJECTED', reason);
      setDetail(folder);
      setShowReject(false);
      setRejectReason('');
      setActionSuccess('Dossier rejeté. Le technicien peut resoumettre ses documents.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors du rejet.');
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!detail) {
    return (
      <EmptyState
        title="Dossier introuvable"
        description={error ?? 'Ce dossier n’existe pas ou vous n’avez pas la permission de le consulter.'}
        action={
          <Link href="/admin/kyc">
            <Button>Retour aux dossiers KYC</Button>
          </Link>
        }
      />
    );
  }

  const technician = detail.technician;
  const name = [technician.firstName, technician.lastName].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      <Link href="/admin/kyc" className="text-sm font-medium text-primary hover:underline">
        ← Retour aux dossiers KYC
      </Link>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-4">
            {technician.avatarUrl ? (
              <img
                src={technician.avatarUrl}
                alt={`Photo de ${name}`}
                className="size-20 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xl font-semibold text-muted-foreground">
                {technicianInitials(technician.firstName, technician.lastName)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">{name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">📍 {technician.city}</p>
              <div className="mt-1.5">
                <Badge variant={kycVariantFor(technician.kycStatus)}>
                  {kycStatusLabel(technician.kycStatus)}
                </Badge>
              </div>
            </div>
          </div>

          <dl className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Téléphone</dt>
              <dd className="font-medium">{technician.phone ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Disponibilité</dt>
              <dd className="font-medium">{technician.isAvailable ? 'Disponible' : 'Indisponible'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Interventions confirmées</dt>
              <dd className="font-medium">{technician.completedInterventions}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Inscrit le</dt>
              <dd className="font-medium">{formatDate(technician.registeredAt)}</dd>
            </div>
          </dl>

          {technician.categories.length > 0 ? (
            <div>
              <span className="block text-sm font-medium">Compétences</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {technician.categories.map((id) => (
                  <Badge key={id} variant="neutral">
                    {categoryLabel(id)}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {technician.specialties.length > 0 ? (
            <div>
              <span className="block text-sm font-medium">Spécialités</span>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {technician.specialties.map((specialty) => (
                  <Badge key={specialty} variant="neutral">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {technician.experience ? (
            <div>
              <span className="block text-sm font-medium">Expérience</span>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {technician.experience}
              </p>
            </div>
          ) : null}

          {technician.serviceDescription ? (
            <div>
              <span className="block text-sm font-medium">Description des services</span>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                {technician.serviceDescription}
              </p>
            </div>
          ) : null}

          {technician.bio ? (
            <div>
              <span className="block text-sm font-medium">Présentation</span>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{technician.bio}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents ({detail.documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document envoyé.</p>
          ) : (
            detail.documents.map((document) => {
              const url = documentUrls[document.id];
              return (
                <div key={document.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{kycDocumentTypeLabel(document.type)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {document.originalName} · {formatFileSize(document.size)} · {formatDate(document.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => handleOpenDocument(document.id)}
                      disabled={fetchingUrlId === document.id}
                    >
                      {fetchingUrlId === document.id ? 'Génération…' : 'Consulter le document'}
                    </Button>
                  </div>
                  {url ? (
                    <div className="overflow-hidden rounded-lg border border-border">
                      {document.mimeType.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={document.originalName} className="max-h-96 w-full bg-muted object-contain" />
                      ) : (
                        <iframe title={document.originalName} src={url} className="h-96 w-full bg-muted" />
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
          <p className="text-xs text-muted-foreground">
            Les documents sont consultables via un lien temporaire signé de 5 minutes, jamais exposés publiquement.
          </p>
        </CardContent>
      </Card>

      {detail.reviews.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des décisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail.reviews.map((review) => (
              <div key={review.createdAt} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    {review.previousStatus} → {review.newStatus}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Par {review.reviewerName || review.reviewerId}</p>
                {review.reason ? (
                  <p className="mt-1 text-sm text-muted-foreground">Motif : {review.reason}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {technician.kycStatus === 'PENDING' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Décision de vérification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {actionSuccess ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300">
                {actionSuccess}
              </p>
            ) : null}
            {actionError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
                {actionError}
              </p>
            ) : null}

            {showReject ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Motif du rejet</span>
                  <Textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Expliquez au technicien ce qui doit être corrigé…"
                    rows={3}
                    maxLength={500}
                  />
                </label>
                <div className="flex items-center gap-2">
                  <Button onClick={handleReject} isLoading={actionBusy} disabled={!rejectReason.trim()}>
                    Confirmer le rejet
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowReject(false);
                      setRejectReason('');
                      setActionError(null);
                    }}
                    disabled={actionBusy}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleValidate} isLoading={actionBusy}>
                  ✓ Valider le profil
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setActionError(null);
                    setShowReject(true);
                  }}
                  disabled={actionBusy}
                >
                  ✕ Rejeter le dossier
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}