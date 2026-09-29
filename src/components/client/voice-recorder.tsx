'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { formatFileSize } from '@/lib/format';

/* Dépôt multimédia — enregistreur vocal (MediaRecorder natif, one-shot).
 *
 * Cycle : prêt → enregistrement (3 min max, auto-stop) → aperçu →
 * valider OU supprimer/réenregistrer. Rien n'est envoyé sans validation
 * explicite. Formats : `audio/webm;codecs=opus` si supporté, sinon
 * `audio/webm`, `audio/mp4` (Safari), sinon défaut navigateur — le backend
 * valide le mime réel (jamais de format inventé). États annoncés
 * (aria-live), contrôles ≥ 44 px, erreurs FR sans jargon. */

export const VOICE_MAX_SECONDS = 180;

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  for (const candidate of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    } catch {
      continue;
    }
  }
  return '';
}

function failureMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Micro refusé. Autorisez l’accès au micro dans votre navigateur, ou choisissez une photo/vidéo.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Aucun micro détecté sur cet appareil. Choisissez une photo ou une vidéo.';
  }
  if (name === 'NotSupportedError') {
    return 'Enregistrement vocal non supporté par ce navigateur. Choisissez une photo ou une vidéo.';
  }
  return 'Enregistrement impossible pour le moment. Réessayez ou choisissez une photo/vidéo.';
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export interface ValidatedVoice {
  blob: Blob;
  durationSeconds: number;
}

export function VoiceRecorder({
  onValidated,
  onCleared,
  disabled,
}: {
  onValidated: (voice: ValidatedVoice) => void;
  onCleared: () => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === 'recording') {
        try {
          recorderRef.current.stop();
        } catch {
          /* démontage : best-effort */
        }
      }
      stopTracks();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const start = async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Enregistrement vocal non supporté par ce navigateur. Choisissez une photo ou une vidéo.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      durationRef.current = 0;
      setSeconds(0);
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stopTracks();
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size < 1) {
          setError('Enregistrement vide. Réessayez.');
          setPhase('idle');
          return;
        }
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setPreviewSize(blob.size);
        setPhase('preview');
      };
      recorder.start(250);
      setPhase('recording');
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setSeconds(durationRef.current);
        if (durationRef.current >= VOICE_MAX_SECONDS) {
          try {
            recorder.stop();
          } catch {
            /* auto-stop best-effort */
          }
        }
      }, 1000);
    } catch (err) {
      stopTracks();
      setError(failureMessage(err));
    }
  };

  const stop = () => {
    try {
      recorderRef.current?.stop();
    } catch {
      setPhase('idle');
    }
  };

  const discard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    blobRef.current = null;
    setPreviewUrl(null);
    setPreviewSize(0);
    setSeconds(0);
    durationRef.current = 0;
    setPhase('idle');
    onCleared();
  };

  const validate = () => {
    const blob = blobRef.current;
    if (!blob) {
      setError('Aperçu illisible. Réenregistrez votre message.');
      return;
    }
    onValidated({ blob, durationSeconds: durationRef.current });
  };

  return (
    <div className="space-y-2" aria-live="polite">
      {phase === 'idle' ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void start()}
          disabled={disabled}
          className="min-h-12 w-full sm:w-auto"
        >
          <Icon name="mic" size="md" />
          Enregistrer un message vocal
        </Button>
      ) : null}

      {phase === 'recording' ? (
        <div className="flex items-center gap-3 rounded-xl border border-error-border bg-error-soft px-4 py-3">
          <span aria-hidden className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-error" />
          </span>
          <p className="flex-1 text-sm font-semibold tabular-nums text-error-ink">
            Enregistrement… {formatDuration(seconds)} / {formatDuration(VOICE_MAX_SECONDS)}
          </p>
          <Button type="button" onClick={stop} disabled={disabled} className="min-h-11">
            Arrêter
          </Button>
        </div>
      ) : null}

      {phase === 'preview' && previewUrl ? (
        <div className="space-y-2 rounded-xl border border-success-border bg-success-soft p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-success-ink">
            <Icon name="mic" size="sm" />
            Aperçu ({formatDuration(durationRef.current)} • {formatFileSize(previewSize)})
          </div>
          <audio controls preload="metadata" src={previewUrl} className="w-full" aria-label="Aperçu de votre message vocal" />
          <div className="flex gap-2">
            <Button type="button" onClick={validate} disabled={disabled} className="min-h-11 flex-1">
              <Icon name="check" size="sm" />
              Valider ce message
            </Button>
            <Button type="button" variant="outline" onClick={discard} disabled={disabled} className="min-h-11">
              <Icon name="x" size="sm" />
              Refaire
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <Alert variant="error" dense>{error}</Alert> : null}
    </div>
  );
}
