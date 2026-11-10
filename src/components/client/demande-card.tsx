'use client';

import { DemandeStatusBadge } from '@/components/ui/status-badge';
import type { DemandeListItem } from '@/lib/api/request-service';
import { formatCurrency, fullName } from '@/lib/format';
import { MissionCard, MissionCardPerson, deviceLabelFor } from '@/components/mission/mission-card';
import { payEscrow, getClientInvoice } from '@/lib/api/request-service';
import { useState } from 'react';
import EscrowCountdown from '@/components/client/EscrowCountdown';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export interface DemandeCardProps {
  demande: DemandeListItem;
}

export function DemandeCard({ demande }: DemandeCardProps) {
  const [escrowBusy, setEscrowBusy] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  const isSmartphone = demande.categoryId === 'SMARTPHONE';

  const handlePayEscrow = async () => {
    if (!demande.id || escrowBusy) return;
    setEscrowBusy(true);
    try {
      const result = await payEscrow(demande.id);
      window.location.reload();
    } catch (err) {
      console.error('Erreur lors de la mise sous séquestre:', err);
    } finally {
      setEscrowBusy(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!demande.id || invoiceBusy) return;
    setInvoiceBusy(true);
    try {
      const inv = await getClientInvoice(demande.id);
      if (inv.pdfUrl) {
        const link = document.createElement('a');
        link.href = inv.pdfUrl;
        link.download = `facture-${demande.reference}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Erreur lors du téléchargement de la facture:', err);
    } finally {
      setInvoiceBusy(false);
    }
  };

  const confirmationBadge = () => {
    if (demande.confirmationStatus === 'PENDING') {
      return (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning-ink">
            <Icon name="clock" size="md" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-warning-ink">En attente de confirmation</p>
            <p className="text-xs text-warning-ink/70">
              Le technicien vous contactera sur WhatsApp pour confirmer votre rendez-vous.
            </p>
          </div>
        </div>
      );
    }
    if (demande.confirmationStatus === 'CONFIRMED') {
      return (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success-ink">
            <Icon name="check-circle" size="md" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-success-ink">Rendez-vous confirmé</p>
            {demande.scheduledAt && (
              <p className="text-xs text-success-ink/70">
                Prévu le {new Date(demande.scheduledAt).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <MissionCard
      reference={demande.reference}
      badge={<DemandeStatusBadge status={demande.status} />}
      categoryLabel={demande.categoryLabel}
      deviceLabel={deviceLabelFor(demande)}
      description={demande.description}
      city={demande.city}
      createdAt={demande.createdAt}
      requestedMode={demande.requestedMode}
      requestedAt={demande.requestedAt}
      footer={
        <div className="flex flex-col gap-3">
          {/* Confirmation WhatsApp status */}
          {confirmationBadge()}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {demande.categoryId === 'SMARTPHONE' && demande.status === 'ACCEPTED' && (
              <Button
                onClick={handlePayEscrow}
                isLoading={escrowBusy}
                className="flex-1 bg-primary text-white hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Procéder au paiement sécurisé
              </Button>
            )}
            {demande.categoryId === 'SMARTPHONE' && demande.status === 'IN_PROGRESS' && demande.escrowEndsAt && (
              <EscrowCountdown escrowEndsAt={demande.escrowEndsAt} />
            )}
            {demande.status === 'COMPLETED' && (
              <Button
                onClick={handleDownloadInvoice}
                isLoading={invoiceBusy}
                className="flex-1 bg-outline text-primary hover:bg-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Télécharger la facture
              </Button>
            )}
          </div>
        </div>
      }
    />
  );
}

export function HistoryDemandeCard({
  demande,
}: {
  demande: DemandeListItem;
}) {
  return (
    <MissionCard
      reference={demande.reference}
      badge={<DemandeStatusBadge status={demande.status} context="history" />}
      categoryLabel={demande.categoryLabel}
      deviceLabel={deviceLabelFor(demande)}
      description={demande.description}
      city={demande.city}
      createdAt={demande.createdAt}
      showTiming={false}
      footer={
        demande.technician ? (
          <MissionCardPerson
            name={fullName(demande.technician.firstName, demande.technician.lastName)}
            amount={formatCurrency(demande.finalAmount)}
          />
        ) : undefined
      }
    />
  );
}
