'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert } from '@/components/ui/alert';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/page-header';
import { formatFileSize } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Dépôt multimédia — « Éléments transmis par le client » (détail client ET
 * technicien assigné : mêmes données, même présentation responsive).
 *
 * - Ordre d'envoi conservé (aucun tri, aucun regroupement destructif).
 * - URLs signées éphémères chargées à la demande : audio/vidéo au premier
 *   appui, photos au montage (bytes `loading="lazy"`, jamais en masse).
 * - Pièces historiques metadata-only (sans stockage) : état explicite
 *   « aperçu indisponible », jamais de visuel fictif.
 * - Lecteurs natifs (`<audio controls>`, `<video controls>`, lightbox
 *   clavier Échap) avec libellés accessibles ; l'état ne repose jamais sur
 *   le seul visuel. */

export interface DemandeMediaItem {
  id: string;
  kind: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  stored: boolean;
}

function isAudio(item: Pick<DemandeMediaItem, 'kind' | 'mimeType'>): boolean {
  return item.kind === 'AUDIO' || item.mimeType.startsWith('audio/');
}

function isVideo(item: Pick<DemandeMediaItem, 'kind' | 'mimeType'>): boolean {
  return item.kind === 'VIDEO' || item.mimeType.startsWith('video/');
}

function isPhoto(item: Pick<DemandeMediaItem, 'kind' | 'mimeType'>): boolean {
  return item.kind === 'IMAGE' || item.mimeType.startsWith('image/');
}

function kindLabel(item: Pick<DemandeMediaItem, 'kind' | 'mimeType'>): string {
  if (isAudio(item)) return 'Message vocal';
  if (isVideo(item)) return 'Vidéo';
  if (isPhoto(item)) return 'Photo';
  return 'Fichier';
}

/* Charge une URL signée à la demande (états : idle → loading → ready →
 * error). Le backend réserve la lecture au propriétaire/assigné. */
function useMediaUrl(
  demandeId: string,
  media: DemandeMediaItem,
  fetchUrl: (demandeId: string, mediaId: string) => Promise<{ url: string }>,
  eager: boolean,
): { url: string | null; loading: boolean; error: string | null; load: () => void } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (url || loading) return;
    setLoading(true);
    setError(null);
    fetchUrl(demandeId, media.id)
      .then(({ url: signed }) => setUrl(signed))
      .catch((err) => setError(toUserErrorMessage(err, 'Fichier indisponible pour le moment.')))
      .finally(() => setLoading(false));
  }, [demandeId, media.id, fetchUrl, url, loading]);

  useEffect(() => {
    if (eager) load();
  }, [eager, load]);

  return { url, loading, error, load };
}

function AudioRow({
  demandeId,
  media,
  fetchUrl,
}: {
  demandeId: string;
  media: DemandeMediaItem;
  fetchUrl: (demandeId: string, mediaId: string) => Promise<{ url: string }>;
}) {
  const { url, loading, error, load } = useMediaUrl(demandeId, media, fetchUrl, false);
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="mic" size="md" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={media.name}>
            {media.name}
          </p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatFileSize(media.sizeBytes)} • Message vocal
          </p>
        </div>
        {!url ? (
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label={`Écouter ${media.name}`}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {loading ? '…' : 'Écouter'}
          </button>
        ) : null}
      </div>
      {error ? <Alert variant="error" dense>{error}</Alert> : null}
      {url ? (
        <audio controls preload="metadata" src={url} className="mt-2 w-full" aria-label={`Lecture de ${media.name}`} />
      ) : null}
    </div>
  );
}

function VideoRow({
  demandeId,
  media,
  fetchUrl,
}: {
  demandeId: string;
  media: DemandeMediaItem;
  fetchUrl: (demandeId: string, mediaId: string) => Promise<{ url: string }>;
}) {
  const { url, loading, error, load } = useMediaUrl(demandeId, media, fetchUrl, false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {url ? (
        <video
          controls
          preload="none"
          src={url}
          aria-label={`Lecture de ${media.name}`}
          className="aspect-video w-full bg-black"
        />
      ) : (
        <button
          type="button"
          onClick={load}
          disabled={loading}
          aria-label={`Charger la vidéo ${media.name}`}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-muted/40 transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icon name="play" size="md" />
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {loading ? 'Chargement…' : 'Lire la vidéo'}
          </span>
        </button>
      )}
      <div className="space-y-0.5 px-3 py-2">
        <p className="truncate text-xs font-medium" title={media.name}>
          {media.name}
        </p>
        <p className="text-2xs tabular-nums text-muted-foreground">
          {formatFileSize(media.sizeBytes)} • Vidéo
        </p>
      </div>
      {error ? <div className="px-3 pb-2"><Alert variant="error" dense>{error}</Alert></div> : null}
    </div>
  );
}

function PhotoThumb({
  demandeId,
  media,
  fetchUrl,
  onOpen,
}: {
  demandeId: string;
  media: DemandeMediaItem;
  fetchUrl: (demandeId: string, mediaId: string) => Promise<{ url: string }>;
  onOpen: (url: string) => void;
}) {
  const { url, loading, error, load } = useMediaUrl(demandeId, media, fetchUrl, true);
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => {
          if (url) onOpen(url);
          else load();
        }}
        disabled={loading && !url}
        aria-label={`Agrandir ${media.name}`}
        className="block h-28 w-full overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50"
      >
        {url ? (
          <img
            src={url}
            alt={media.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Icon name="camera" size="xl" />
          </span>
        )}
      </button>
      <div className="space-y-0.5 px-2.5 py-2">
        <p className="truncate text-xs font-medium" title={media.name}>
          {media.name}
        </p>
        <p className="text-2xs tabular-nums text-muted-foreground">
          {loading && !url ? 'Chargement…' : formatFileSize(media.sizeBytes)} • Photo
        </p>
      </div>
      {error ? <div className="px-2.5 pb-2 text-xs text-error-ink">{error}</div> : null}
    </div>
  );
}

export function DemandeMediaSection({
  demandeId,
  medias,
  fetchUrl,
  title = 'Éléments transmis par le client',
}: {
  demandeId: string;
  medias: DemandeMediaItem[];
  fetchUrl: (demandeId: string, mediaId: string) => Promise<{ url: string }>;
  title?: string;
}) {
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [lightbox]);

  const openPhoto = useCallback((media: DemandeMediaItem) => (url: string) => {
    setLightbox({ url, name: media.name });
  }, []);

  return (
    <div className="space-y-3">
      <SectionHeader
        title={title}
        icon="camera"
        description={
          medias.length > 0
            ? `${medias.length} fichier${medias.length !== 1 ? 's' : ''} décrivant la panne.`
            : undefined
        }
      />
      {medias.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun élément transmis pour le moment.
        </p>
      ) : (
        <div className="space-y-3">
          {medias.map((media) => {
            // Pièces historiques metadata-only : état explicite, jamais de
            // lecteur fictif (le fichier d'origine reste associé).
            if (!media.stored) {
              return (
                <div key={media.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon name="file" size="md" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={media.name}>
                      {media.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(media.sizeBytes)} • {kindLabel(media)} • Aperçu indisponible
                    </p>
                  </div>
                </div>
              );
            }
            if (isAudio(media)) {
              return <AudioRow key={media.id} demandeId={demandeId} media={media} fetchUrl={fetchUrl} />;
            }
            if (isVideo(media)) {
              return <VideoRow key={media.id} demandeId={demandeId} media={media} fetchUrl={fetchUrl} />;
            }
            return (
              <PhotoThumb
                key={media.id}
                demandeId={demandeId}
                media={media}
                fetchUrl={fetchUrl}
                onOpen={openPhoto(media)}
              />
            );
          })}
        </div>
      )}

      {lightbox && mounted
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={lightbox.name}
              onClick={() => setLightbox(null)}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            >
              <div
                onClick={(event) => event.stopPropagation()}
                className="animate-pop-in w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-pop"
              >
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={lightbox.name}>
                    {lightbox.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setLightbox(null)}
                    aria-label="Fermer la visionneuse"
                    className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon name="x" size="sm" />
                  </button>
                </div>
                <div className="flex max-h-[70dvh] items-center justify-center overflow-auto bg-muted/20 p-4">
                  <img
                    src={lightbox.url}
                    alt={lightbox.name}
                    className="max-h-[65dvh] w-auto rounded-xl object-contain shadow-lg"
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
