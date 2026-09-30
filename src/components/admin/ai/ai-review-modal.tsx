'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* IA-9 — modale de revue humaine partagée (note admin optionnelle,
 * timestamp serveur, historique conservé côté backend). */
export function AiReviewModal({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  onDone,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (note: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setNote('');
    setError(null);
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(note.trim());
      setNote('');
      onDone();
    } catch (err) {
      setError(toUserErrorMessage(err, 'Revue impossible pour le moment.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      description={description}
      sheet
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} isLoading={busy}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <Field label="Note d’examen (optionnelle)" htmlFor="ai-review-note" hint="Conservée avec votre identifiant et la date serveur.">
          <Textarea
            id="ai-review-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Constat factuel, décision, suite à donner…"
          />
        </Field>
        {error ? <Alert variant="error">{error}</Alert> : null}
      </div>
    </Modal>
  );
}
