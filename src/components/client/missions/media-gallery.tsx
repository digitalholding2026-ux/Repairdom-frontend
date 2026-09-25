'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/icon';
import { SectionHeader } from '@/components/ui/page-header';
import { formatFileSize } from '@/lib/format';
import { triggerHaptic } from '@/lib/haptics';
import { useToast } from '@/lib/toast-context';

export interface MediaGalleryItem {
  id: string;
  kind: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

interface PendingMedia {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl: string | null;
}

type GalleryFilter = 'all' | 'photos' | 'docs';
type SelectedMedia =
  | { type: 'server'; media: MediaGalleryItem }
  | { type: 'pending'; media: PendingMedia }
  | null;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function isPhoto(media: Pick<MediaGalleryItem, 'kind' | 'mimeType'>): boolean {
  return media.kind === 'IMAGE' || media.mimeType.startsWith('image/');
}

function kindLabel(media: Pick<MediaGalleryItem, 'kind' | 'mimeType'>): string {
  if (isPhoto(media)) return 'Photo';
  if (media.mimeType.includes('pdf')) return 'PDF';
  return 'Document';
}

/* Galerie médias de la mission : filtres par type (Tous / Photos /
 * Documents), dropzone d'ajout (aperçus locaux, envoi backend à venir) et
 * visionneuse lightbox. Les pièces serveur n'exposent que des métadonnées
 * (aucune URL de téléchargement fournie par l'API) : aucun visuel fictif. */
export function MediaGallery({ medias }: { medias: MediaGalleryItem[] }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<SelectedMedia>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Portail body pour la lightbox (même raison que le chat flottant :
   * le `fixed` serait capturé par le transform du layout animé). */
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      for (const item of pending) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const addFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;
    const accepted: PendingMedia[] = [];
    for (const file of incoming) {
      if (file.size > MAX_FILE_BYTES) {
        toast({ title: `${file.name} dépasse 10 Mo.`, variant: 'error' });
        continue;
      }
      accepted.push({
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      });
    }
    if (accepted.length === 0) return;
    triggerHaptic();
    setPending((prev) => [...accepted, ...prev]);
    toast({
      title: 'Aperçu local ajouté.',
      description: 'L’envoi de nouvelles pièces au technicien sera bientôt disponible.',
      variant: 'info',
    });
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
    triggerHaptic();
  };

  const photos = medias.filter(isPhoto).length;
  const docs = medias.length - photos;
  const visible =
    filter === 'photos' ? medias.filter(isPhoto) : filter === 'docs' ? medias.filter((m) => !isPhoto(m)) : medias;
  const total = medias.length + pending.length;

  const tabs: Array<{ id: GalleryFilter; label: string }> = [
    { id: 'all', label: `Tous (${medias.length})` },
    { id: 'photos', label: `Photos (${photos})` },
    { id: 'docs', label: `Documents (${docs})` },
  ];

  const selectedPreview = selected?.type === 'pending' ? selected.media.previewUrl : null;
  const selectedMeta =
    selected?.type === 'server'
      ? { name: selected.media.name, size: formatFileSize(selected.media.sizeBytes), kind: kindLabel(selected.media) }
      : selected
        ? { name: selected.media.name, size: formatFileSize(selected.media.sizeBytes), kind: kindLabel({ kind: '', mimeType: selected.media.mimeType }) }
        : null;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Photos & Pièces jointes"
        icon="camera"
        description={
          total > 0
            ? `${total} fichier${total > 1 ? 's' : ''} illustrant la panne déclarée.`
            : 'Ajoutez des photos de la panne pour aider le technicien.'
        }
        action={
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1" role="tablist" aria-label="Filtrer par type">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  filter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Dropzone d'ajout */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Ajouter des photos ou documents (JPG, PNG, PDF, 10 Mo max)"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          className={cn(
            'flex min-h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40',
          )}
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
            <Icon name="plus" size="sm" />
          </span>
          <span className="text-xs font-semibold">Ajouter des photos</span>
          <span className="text-2xs text-muted-foreground">Glisser-déposer ou parcourir (max 10 Mo)</span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        {/* Aperçus locaux en attente */}
        {pending.map((item) => (
          <div
            key={item.id}
            className="group relative overflow-hidden rounded-xl border border-warning-border bg-card"
          >
            <button
              type="button"
              onClick={() => setSelected({ type: 'pending', media: item })}
              aria-label={`Agrandir ${item.name}`}
              className="block h-28 w-full overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-muted-foreground transition-transform duration-300 group-hover:scale-105">
                  <Icon name="file" size="xl" />
                </span>
              )}
            </button>
            <span className="absolute left-2 top-2 rounded-full bg-warning-soft px-2 py-0.5 text-2xs font-semibold text-warning-ink">
              En attente
            </span>
            <button
              type="button"
              onClick={() => removePending(item.id)}
              aria-label={`Retirer ${item.name}`}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="x" size="sm" />
            </button>
            <p className="truncate px-2.5 py-2 text-xs font-medium" title={item.name}>
              {item.name}
            </p>
          </div>
        ))}

        {/* Pièces jointes de la mission */}
        {visible.map((media) => {
          const photo = isPhoto(media);
          return (
            <div
              key={media.id}
              className="group overflow-hidden rounded-xl border border-border bg-muted/20"
            >
              <button
                type="button"
                onClick={() => setSelected({ type: 'server', media })}
                aria-label={`Inspecter ${media.name}`}
                className="block h-28 w-full overflow-hidden bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex h-full w-full items-center justify-center text-muted-foreground transition-transform duration-300 group-hover:scale-105">
                  <Icon name={photo ? 'camera' : 'file'} size="xl" />
                </span>
              </button>
              <div className="space-y-0.5 px-2.5 py-2">
                <p className="truncate text-xs font-medium" title={media.name}>
                  {media.name}
                </p>
                <p className="text-2xs tabular-nums text-muted-foreground">
                  {formatFileSize(media.sizeBytes)} • {kindLabel(media)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {visible.length === 0 && pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Aucun fichier dans cette catégorie pour le moment.
        </p>
      ) : null}

      {/* Lightbox (portail body : suit le viewport quel que soit le scroll) */}
      {selected && selectedMeta && mounted
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={selectedMeta.name}
              onClick={() => setSelected(null)}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            >
          <div
            onClick={(event) => event.stopPropagation()}
            className="animate-pop-in w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-pop"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" title={selectedMeta.name}>
                  {selectedMeta.name}
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {selectedMeta.size} • {selectedMeta.kind}
                </p>
              </div>
              {selectedPreview ? (
                <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-2xs font-semibold text-primary">
                  Aperçu local
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fermer la visionneuse"
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon name="x" size="sm" />
              </button>
            </div>
            <div className="flex max-h-[70dvh] items-center justify-center overflow-auto bg-muted/20 p-4">
              {selectedPreview ? (
                <img
                  src={selectedPreview}
                  alt={selectedMeta.name}
                  className="max-h-[65dvh] w-auto rounded-xl object-contain shadow-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                    <span className="flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    <Icon name="file" size="xl" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Aperçu indisponible : le fichier d’origine reste associé à la mission.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}
