'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Icon } from '@/components/ui/icon';
import type { CatalogDeleteOutcome } from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Bouton « Supprimer » générique du back-office catalogue : confirmation
 * explicite (jamais de clic immédiat), puis suppression physique si l'élément
 * est sans dépendance, désactivation sinon (historique conservé). Le résultat
 * exact (DELETED / DEACTIVATED / HARD_DELETED + message backend) remonte via
 * `onDone`.
 *
 * Mode `hard` (catalogue/domaine uniquement) : suppression définitive
 * irréversible en transaction atomique. Exige une case à cocher explicite
 * et affiche le message imposé : « Cette action supprimera définitivement ce
 * catalogue et les éléments qui lui appartiennent. Cette action est
 * irréversible. » */
export function DeleteCatalogItem({
  itemLabel,
  onDelete,
  onDone,
  hard = false,
}: {
  itemLabel: string;
  onDelete: () => Promise<CatalogDeleteOutcome>;
  onDone: (outcome: CatalogDeleteOutcome | null, error: string | null) => void;
  hard?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const confirm = async () => {
    if (hard && !acknowledged) return;
    setBusy(true);
    try {
      const outcome = await onDelete();
      setOpen(false);
      setAcknowledged(false);
      onDone(outcome, null);
    } catch (err) {
      setOpen(false);
      setAcknowledged(false);
      onDone(null, toUserErrorMessage(err, 'Erreur lors de la suppression.'));
    } finally {
      setBusy(false);
    }
  };

  const openDialog = () => {
    setAcknowledged(false);
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={hard ? `Supprimer définitivement ${itemLabel}` : `Supprimer ${itemLabel}`}
        title={hard ? `Supprimer définitivement ${itemLabel}` : `Supprimer ${itemLabel}`}
        onClick={openDialog}
      >
        <Icon name="x" size="sm" />
      </Button>
      <ConfirmDialog
        open={open}
        onCancel={() => {
          setOpen(false);
          setAcknowledged(false);
        }}
        onConfirm={() => void confirm()}
        loading={busy}
        tone="danger"
        title={hard ? `Supprimer définitivement « ${itemLabel} » ?` : `Supprimer « ${itemLabel} » ?`}
        description={
          hard
            ? 'Cette action supprimera définitivement ce catalogue et les éléments qui lui appartiennent. Cette action est irréversible.'
            : "Cette action peut être irréversible. Sans dépendance, l'élément est supprimé ; s'il est référencé (mission, devis, tarif, historique), il est désactivé et l'historique est conservé."
        }
        confirmLabel={hard ? 'Supprimer définitivement' : 'Supprimer'}
        confirmDisabled={hard && !acknowledged}
        extra={
          hard ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                aria-label="Je comprends que cette action est irréversible"
              />
              <span>Je comprends que cette action est irréversible.</span>
            </label>
          ) : undefined
        }
      />
    </>
  );
}
