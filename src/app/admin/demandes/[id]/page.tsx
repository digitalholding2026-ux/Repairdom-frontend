'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useToast } from '@/lib/toast-context';
import { getAdminMissionByReference, type SupervisedMission } from '@/lib/api/admin-service';
import { updateDemandeStatus } from '@/lib/api/request-service';
import { completeAdminDemande, type AdminInvoice, confirmAdminDemande, noShowAdminDemande } from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

function statusVariant(status: string): string {
  switch (status) {
    case 'ACCEPTED':
    case 'SCHEDULED':
    case 'IN_PROGRESS':
      return 'bg-info-soft text-info-ink';
    case 'COMPLETED':
      return 'bg-success-soft text-success-ink';
    case 'CANCELED':
      return 'bg-error-soft text-error-ink';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    SUBMITTED: 'Soumis',
    PENDING: 'En attente',
    ACCEPTED: 'Accepté',
    SCHEDULED: 'Planifié',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    CANCELED: 'Annulé',
  };
  return map[status] ?? status;
}

export default function AdminDemandeDetailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = useParams();
  const reference = (Array.isArray(id) ? id[0] : id ?? '').toUpperCase();
  const [mission, setMission] = useState<SupervisedMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [noshowing, setNoshowing] = useState(false);
  const [invoice, setInvoice] = useState<AdminInvoice | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void getAdminMissionByReference(reference)
      .then((data) => {
        setMission(data);
        setError(null);
      })
      .catch((err) => {
        setError(toUserErrorMessage(err, 'Impossible de charger la demande.'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [reference]);

  const handleStatusChange = async (newStatus: string) => {
    if (!mission) return;
    setUpdating(true);
    try {
      await updateDemandeStatus(mission.reference, newStatus);
      setMission((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de changer le statut.'));
    } finally {
      setUpdating(false);
    }
  };

  const handleComplete = async () => {
    if (!mission) return;
    setCompleting(true);
    setError(null);
    try {
      const result = await completeAdminDemande(mission.reference);
      setMission((prev) => (prev ? { ...prev, status: 'COMPLETED' } : prev));
      setInvoice(result.invoice);
      setError(null);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de clôturer la demande.'));
    } finally {
      setCompleting(false);
    }
  };

  const handleConfirm = async () => {
    if (!mission) return;
    setConfirming(true);
    setError(null);
    try {
      const result = await confirmAdminDemande(mission.reference);
      setMission((prev) =>
        prev ? { ...prev, confirmationStatus: result.confirmationStatus } : prev,
      );
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de confirmer le rendez-vous.'));
    } finally {
      setConfirming(false);
    }
  };

  const handleNoShow = async () => {
    if (!mission) return;
    setNoshowing(true);
    setError(null);
    try {
      const updated = await noShowAdminDemande(mission.reference);
      setMission((prev) =>
        prev
          ? { ...prev, isNoShow: true, status: 'CANCELED' }
          : prev,
      );
      toast({
        title: 'Client absent (No-Show)',
        description: `Les frais de déplacement ont été acquis à Relio pour la mission ${updated.reference}.`,
        variant: 'error',
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de marquer comme absent.'));
    } finally {
      setNoshowing(false);
    }
  };

  /* Formate un numéro de téléphone camerounais pour whatsapp.me (237 + 9 chiffres). */
  function formatWhatsAppNumber(phone: string | null | undefined): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('237')) return digits;
    if (digits.startsWith('0')) return '237' + digits.slice(1);
    if (digits.length === 9 && digits.startsWith('6')) return '237' + digits;
    return digits;
  }

  function getWhatsAppUrl(phone: string | null | undefined, message: string): string {
    const number = formatWhatsAppNumber(phone);
    if (!number) return '';
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader title="Demande" description="Détail de la demande." />
        <Alert variant="error">{error}</Alert>
        <Button variant="secondary" onClick={() => router.push('/admin/demandes')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  if (loading || !mission) {
    return (
      <div className="space-y-5">
        <PageHeader title="Demande" description="Détail de la demande." />
        <div role="status" aria-label="Chargement">
          <span className="sr-only">Chargement…</span>
          <Spinner />
        </div>
      </div>
    );
  }

  const statusOptions = [
    { value: 'ACCEPTED', label: 'Prendre en charge' },
    { value: 'IN_PROGRESS', label: 'En cours' },
    { value: 'COMPLETED', label: 'Terminer' },
    { value: 'CANCELED', label: 'Annuler' },
  ];

  const escrowStartedAt = (mission as { escrowStartedAt?: string | null }).escrowStartedAt;
  const escrowHours = escrowStartedAt ? Math.floor((Date.now() - new Date(escrowStartedAt).getTime()) / 3600000) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Demande ${mission.reference}`}
        description="Gestion et supervision de la demande client."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Client */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Client</h3>
          {mission.client ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {mission.client.firstName} {mission.client.lastName ?? ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {mission.client.phone ?? '—'}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>

        {/* Adresse / Contact */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Lieu de l'intervention</h3>
          <div className="space-y-2 text-sm">
            <p>
              {mission.contact.address ?? '—'}{' '}
              {mission.contact.neighborhood ? `, ${mission.contact.neighborhood}` : ''}
            </p>
            <p>{mission.contact.city ?? '—'}</p>
            <p className="text-xs text-muted-foreground">
              {mission.contact.contactPhone ?? '—'}
            </p>
          </div>
        </div>

        {/* Équipement / Problème */}
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Prestation</h3>
          <div className="space-y-2 text-sm">
            <p>
              {mission.device.problem?.name ?? mission.category}
            </p>
            {mission.device.brand?.name && mission.device.model?.name ? (
              <p className="text-xs text-muted-foreground">
                {mission.device.brand.name} {mission.device.model.name}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Montant et statut */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Montant final</h3>
          <p className="text-2xl font-semibold">
            {mission.finalAmount != null ? formatCurrency(mission.finalAmount, 'XAF') : '—'}
          </p>
        </div>
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Statut actuel</h3>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusVariant(mission.status)}`}>
            {formatStatus(mission.status)}
          </span>
        </div>
        <div className="bg-card rounded-xl border p-5 flex flex-col justify-between">
          <h3 className="text-sm font-semibold mb-3">Changer le statut</h3>
          <select
            value={mission.status}
            onChange={(e) => void handleStatusChange(e.target.value)}
            disabled={updating}
            className="w-full h-11 appearance-none rounded-lg border border-border bg-card pl-3.5 pr-10 text-base text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
          >
            {statusOptions
              .filter((o) => o.value !== mission.status)
              .map((o) => (
                <option key={o.value} value={o.value} disabled={updating}>
                  {o.label}
                </option>
              ))}
          </select>
          {updating && <Spinner className="h-4 w-4 mx-auto mt-2" />}
        </div>
      </div>

      {/* Diagnostics */}
      {mission.diagnostics.length > 0 && (
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Diagnostics</h3>
          <div className="divide-y">
            {mission.diagnostics.map((d) => (
              <div key={d.id} className="py-3">
                <p className="text-sm font-medium">{d.content}</p>
                {d.proposedIntervention && (
                  <p className="text-xs text-muted-foreground">
                    Intervention proposée : {d.proposedIntervention}
                  </p>
                )}
                {d.justification && (
                  <p className="text-xs text-muted-foreground">
                    Justification : {d.justification}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Devis */}
      {mission.quotes.length > 0 && (
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Devis</h3>
          <div className="divide-y">
            {mission.quotes.map((q) => (
              <div key={q.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {q.amount.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p className="text-xs text-muted-foreground">{q.description}</p>
                </div>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground`}>
                  {q.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {mission.status !== 'COMPLETED' ? (
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">Clôture et facture</h3>
          <Button
            onClick={handleComplete}
            disabled={completing || !mission.finalAmount}
            className="w-full"
          >
            {completing ? 'Clôture en cours…' : 'Terminer et facturer'}
          </Button>
          {!mission.finalAmount && (
            <p className="text-xs text-muted-foreground mt-2">
              Aucun montant final défini : impossible de facturer.
            </p>
          )}
        </div>
      ) : null}
      {escrowStartedAt ? (
        <div className="bg-card rounded-xl border p-5">
          <h3 className="text-sm font-semibold mb-3">État de l&apos;escrow</h3>
          <div className="space-y-1 text-sm">
            <p>Fonds bloqués depuis {escrowHours} h</p>
            <p className="text-xs text-muted-foreground">{mission.status}</p>
            {invoice && (
              <p className="text-xs text-muted-foreground">
                Facture {invoice.invoiceNumber} ({formatCurrency(invoice.amount, 'XAF')})
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Confirmation WhatsApp (M2) */}
      <div className="bg-card rounded-xl border p-5">
        <h3 className="text-sm font-semibold mb-3">Confirmation du rendez-vous</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Statut de confirmation</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                mission.confirmationStatus === 'CONFIRMED'
                  ? 'bg-success-soft text-success-ink'
                  : mission.confirmationStatus === 'CANCELLED_BY_ADMIN' || mission.confirmationStatus === 'NO_SHOW'
                    ? 'bg-error-soft text-error-ink'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {mission.confirmationStatus === 'CONFIRMED'
                ? 'Confirmé'
                : mission.confirmationStatus === 'CANCELLED_BY_ADMIN' || mission.confirmationStatus === 'NO_SHOW'
                  ? 'Annulé (admin)'
                  : 'En attente de confirmation'}
            </span>
          </div>

          {/* Bouton WhatsApp */}
          {mission.client && mission.contact.contactPhone ? (
            <Button
              onClick={() => {
                const client = mission.client!;
                const clientName = `${client.firstName} ${client.lastName ?? ''}`.trim();
                const model = mission.device.model?.name || mission.category;
                const address = [mission.contact.address, mission.contact.city]
                  .filter(Boolean)
                  .join(', ');
                const message = `Bonjour ${clientName}, c'est le technicien Relio. J'ai bien reçu votre demande pour ${model}. Je suis disponible pour passer. Confirmez-vous le rendez-vous à l'adresse ${address} ?`;
                const url = getWhatsAppUrl(mission.contact.contactPhone, message);
                if (url) window.open(url, '_blank');
              }}
              className="w-full flex items-center justify-center gap-2"
            >
              <span>Contacter sur WhatsApp</span>
              <span className="text-[10px]">↗</span>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Aucun numéro de téléphone client disponible.</p>
          )}

          {/* Boutons d'action confirmation */}
          {mission.status !== 'COMPLETED' && mission.status !== 'CANCELED' ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleConfirm}
                disabled={confirming || mission.confirmationStatus === 'CONFIRMED'}
                className="w-full"
              >
                {confirming ? 'Confirmation…' : 'Marquer comme Confirmé'}
              </Button>
              <Button
                onClick={handleNoShow}
                disabled={noshowing || mission.isNoShow || mission.status === 'CANCELED'}
                variant="destructive"
                className="w-full"
              >
                {noshowing ? 'Traitement…' : 'Signaler un client absent (No-Show)'}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <Button variant="outline" onClick={() => router.push('/admin/demandes')}>
          Retour à la liste
        </Button>
      </div>
    </div>
  );
}
