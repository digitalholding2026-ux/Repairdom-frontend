import { siteConfig } from '@/lib/site-config';

export interface RequestMedia {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface RequestLocation {
  city: string;
  address?: string;
}

export interface CreateDemandeInput {
  categoryId: string;
  description: string;
  medias: Array<{ name: string; type: string; size: number }>;
  city: string;
  address?: string;
}

export interface CreateDemandeResult {
  id: string;
  reference: string;
  status: string;
  categoryId: string;
  description: string;
  city: string;
  address: string | null;
  medias: Array<{
    id: string;
    kind: string;
    name: string;
    mimeType: string;
    sizeBytes: number;
    stored: boolean;
  }>;
  mediaPersisted: boolean;
  storageStatus: string;
  createdAt: string;
}

const MEDIA_KIND_MAP: Record<string, string> = {
  'image/': 'IMAGE',
  'video/': 'VIDEO',
  'audio/': 'AUDIO',
};

function resolveMediaKind(mimeType: string): string {
  for (const [prefix, kind] of Object.entries(MEDIA_KIND_MAP)) {
    if (mimeType.startsWith(prefix)) return kind;
  }
  return 'IMAGE';
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function createDemande(input: CreateDemandeInput): Promise<CreateDemandeResult> {
  const res = await fetch(`${siteConfig.apiBaseUrl}/demandes`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryId: input.categoryId,
      description: input.description,
      city: input.city,
      address: input.address || undefined,
      medias: input.medias.map((m) => ({
        kind: resolveMediaKind(m.type),
        name: m.name,
        mimeType: m.type,
        sizeBytes: m.size,
      })),
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (body as { message?: string | string[] } | null)?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    throw new ApiError(text ?? `Erreur ${res.status}`, res.status);
  }

  return body as CreateDemandeResult;
}
