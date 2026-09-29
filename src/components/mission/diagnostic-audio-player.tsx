'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* IA-3 — lecteur de note vocale d'un diagnostic (technicien assigné,
 * client propriétaire, admin selon ses vues). URL signée éphémère chargée
 * au premier appui uniquement (jamais préchargée, jamais persistée).
 * Le sens ne repose jamais sur le seul visuel (libellé + état texte). */

export function DiagnosticAudioPlayer({
  demandeId,
  diagnosticId,
  diagnosticLabel,
  fetchUrl,
}: {
  demandeId: string;
  diagnosticId: string;
  diagnosticLabel: string;
  fetchUrl: (demandeId: string, diagnosticId: string) => Promise<{ url: string }>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(null);
    setError(null);
    setLoading(false);
  }, [diagnosticId]);

  const load = useCallback(() => {
    if (url || loading) return;
    setLoading(true);
    setError(null);
    fetchUrl(demandeId, diagnosticId)
      .then(({ url: signed }) => setUrl(signed))
      .catch((err) => setError(toUserErrorMessage(err, 'Note vocale indisponible pour le moment.')))
      .finally(() => setLoading(false));
  }, [demandeId, diagnosticId, fetchUrl, url, loading]);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="mic" size="sm" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          Note vocale — <span className="text-muted-foreground">{diagnosticLabel}</span>
        </p>
        {!url ? (
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label={`Écouter la note vocale (${diagnosticLabel})`}
            className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Icon name="play" size="sm" />
            {loading ? '…' : 'Écouter'}
          </button>
        ) : null}
      </div>
      {error ? (
        <Alert variant="error" dense>
          {error}
        </Alert>
      ) : null}
      {url ? (
        <audio
          controls
          preload="metadata"
          src={url}
          className="mt-2 w-full"
          aria-label={`Lecture de la note vocale (${diagnosticLabel})`}
        />
      ) : null}
    </div>
  );
}
