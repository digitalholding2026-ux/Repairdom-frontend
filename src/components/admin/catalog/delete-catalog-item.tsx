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
 * exact (DELETED / DEACTIVATED + message backend) remonte via `onDone`. */
export function DeleteCatalogItem({
  itemLabel,
  onDelete,
  onDone,
}: {
  itemLabel: string;
  onDelete: () => Promise<CatalogDeleteOutcome>;
  onDone: (outcome: CatalogDeleteOutcome | null, error: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const outcome = await onDelete();
      setOpen(false);
      onDone(outcome, null);
    } catch (err) {
      setOpen(false);
      onDone(null, toUserErrorMessage(err, 'Erreur lors de la suppression.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Supprimer ${itemLabel}`}
        title={`Supprimer ${itemLabel}`}
        onClick={() => setOpen(true)}
      >
        <Icon name="x" size="sm" />
      </Button>
      <ConfirmDialog
        open={open}
        onCancel={() => setOpen(false)}
        onConfirm={() => void confirm()}
        loading={busy}
        tone="danger"
        title={`Supprimer « ${itemLabel} » ?`}
        description="Cette action peut être irréversible. Sans dépendance, l'élément est supprimé ; s'il est référencé (mission, devis, tarif, historique), il est désactivé et l'historique est conservé."
        confirmLabel="Supprimer"
      />
    </>
  );
}
