'use client';

import { useState } from 'react';
import {
  deleteDiagnosticAudio,
  selectDemandeDiagnostic,
  createDemandeQuote,
  uploadDiagnosticAudio,
} from '@/lib/api/technician-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* IA-3 — logique PARTAGÉE du diagnostic libre + devis (données, validation,
 * envoi). Présentation isolée Desktop/Mobile. Aucun appel IA, aucun barème
 * bloquant : devis MANUAL via le workflow quote existant (source MANUAL,
 * protections conservées). */

export const FREE_DIAGNOSTIC_MIN_LENGTH = 10;
export const FREE_DIAGNOSTIC_MAX_LENGTH = 2000;

export interface FreeDiagnosticData {
  content: string;
  setContent: (value: string) => void;
  explanation: string;
  setExplanation: (value: string) => void;
  voice: { blob: Blob; durationSeconds: number } | null;
  setVoice: (voice: { blob: Blob; durationSeconds: number } | null) => void;
  voiceKey: number;
  amount: string;
  setAmount: (value: string) => void;
  submitting: boolean;
  uploadStatus: string | null;
  error: string | null;
  contentError: string | null;
  amountError: string | null;
  canSubmit: boolean;
  submit: () => void;
}

export function useFreeDiagnostic(
  demandeId: string,
  onDone: () => void,
): FreeDiagnosticData {
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [voice, setVoice] = useState<{ blob: Blob; durationSeconds: number } | null>(null);
  const [voiceKey, setVoiceKey] = useState(0);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = content.trim();
  const contentError =
    trimmed.length > 0 && trimmed.length < FREE_DIAGNOSTIC_MIN_LENGTH
      ? `Minimum ${FREE_DIAGNOSTIC_MIN_LENGTH} caractères (${trimmed.length} actuellement).`
      : null;
  const parsedAmount = amount.trim() === '' ? null : Number(amount.replace(/\s/g, ''));
  const amountError =
    amount.trim() === ''
      ? null
      : parsedAmount === null || !Number.isInteger(parsedAmount) || parsedAmount < 1
        ? 'Montant invalide : saisissez un entier XAF supérieur à 0.'
        : null;
  const canSubmit =
    !submitting && trimmed.length >= FREE_DIAGNOSTIC_MIN_LENGTH && parsedAmount !== null && amountError === null;

  const submit = () => {
    if (!canSubmit) {
      if (trimmed.length < FREE_DIAGNOSTIC_MIN_LENGTH) {
        setError(`Décrivez le diagnostic (${FREE_DIAGNOSTIC_MIN_LENGTH} caractères minimum).`);
      } else if (amountError) {
        setError(amountError);
      }
      return;
    }
    setError(null);
    setSubmitting(true);
    void (async () => {
      let audioStoragePath: string | undefined;
      let diagnosticLinked = false;
      try {
        // 1. Note vocale d'abord (liée en transaction à la création).
        if (voice) {
          setUploadStatus('Envoi de la note vocale…');
          const ext = voice.blob.type.includes('mp4') || voice.blob.type.includes('m4a') ? 'm4a' : 'webm';
          const uploaded = await uploadDiagnosticAudio(
            demandeId,
            new File([voice.blob], `note-vocale.${ext}`, { type: voice.blob.type || 'audio/webm' }),
          );
          audioStoragePath = uploaded.storagePath;
        }
        // 2. Diagnostic libre MANUAL (sans catalogue — IA-5 plus tard).
        setUploadStatus('Enregistrement du diagnostic…');
        await selectDemandeDiagnostic(demandeId, {
          mode: 'MANUAL',
          content: trimmed,
          recommendation: explanation.trim() || undefined,
          ...(audioStoragePath ? { audioStoragePath } : {}),
        });
        // Audio désormais référencé par le diagnostic : ne plus le nettoyer.
        diagnosticLinked = true;
        // 3. Devis MANUAL via le workflow quote existant (source MANUAL,
        // mêmes protections : conflit si accepté, rejet des PENDING).
        setUploadStatus('Envoi du devis…');
        await createDemandeQuote(demandeId, {
          amount: parsedAmount as number,
          description: trimmed.slice(0, 1000),
        });
        setUploadStatus(null);
        setContent('');
        setExplanation('');
        setVoice(null);
        setVoiceKey((key) => key + 1);
        setAmount('');
        onDone();
      } catch (err) {
        // Diagnostic éventuellement créé sans devis : état cohérent existant
        // (diagnostic sans devis, comme le parcours manuel actuel), erreur
        // explicite. L'audio n'est nettoyé que s'il n'a pas été lié.
        if (audioStoragePath && !diagnosticLinked) {
          try {
            await deleteDiagnosticAudio(demandeId, audioStoragePath);
          } catch {
            /* abandon silencieux : rien n'est référencé */
          }
        }
        setError(toUserErrorMessage(err, 'Envoi impossible pour le moment.'));
        setUploadStatus(null);
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return {
    content,
    setContent,
    explanation,
    setExplanation,
    voice,
    setVoice: (next) => {
      setVoice(next);
      if (!next) setVoiceKey((key) => key + 1);
    },
    voiceKey,
    amount,
    setAmount,
    submitting,
    uploadStatus,
    error,
    contentError,
    amountError,
    canSubmit,
    submit,
  };
}
