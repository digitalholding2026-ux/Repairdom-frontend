'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  justifyAiWarning,
  listMyAiWarnings,
  type AiWarning,
} from '@/lib/api/ai-warnings-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* IA-7 — hook partagé (données + justification). Présentation isolée :
 * DesktopView (tableau) / MobileView (cards). Aucune logique métier ici
 * au-delà de l'appel API (délais et statuts calculés backend). */
export function useAiWarnings() {
  const [warnings, setWarnings] = useState<AiWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [justifyId, setJustifyId] = useState<string | null>(null);
  const [justifyText, setJustifyText] = useState('');
  const [justifyError, setJustifyError] = useState<string | null>(null);
  const [justifyBusy, setJustifyBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setWarnings(await listMyAiWarnings());
      setError(null);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors du chargement des avertissements.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openJustify = useCallback((warning: AiWarning) => {
    setJustifyId(warning.id);
    setJustifyText(warning.justification ?? '');
    setJustifyError(null);
  }, []);

  const closeJustify = useCallback(() => {
    if (justifyBusy) return;
    setJustifyId(null);
    setJustifyText('');
    setJustifyError(null);
  }, [justifyBusy]);

  const submitJustify = useCallback(async () => {
    if (!justifyId) return;
    const text = justifyText.trim();
    if (text.length < 10) {
      setJustifyError('Justification trop courte (10 caractères minimum).');
      return;
    }
    if (text.length > 2000) {
      setJustifyError('Justification trop longue (2000 caractères maximum).');
      return;
    }
    setJustifyBusy(true);
    setJustifyError(null);
    try {
      const updated = await justifyAiWarning(justifyId, text);
      setWarnings((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setJustifyId(null);
      setJustifyText('');
    } catch (err) {
      setJustifyError(toUserErrorMessage(err, 'Envoi impossible pour le moment.'));
    } finally {
      setJustifyBusy(false);
    }
  }, [justifyId, justifyText]);

  return {
    warnings,
    loading,
    error,
    reload: load,
    justifyId,
    justifyText,
    setJustifyText,
    justifyError,
    justifyBusy,
    openJustify,
    closeJustify,
    submitJustify,
  };
}

export type AiWarningsController = ReturnType<typeof useAiWarnings>;
