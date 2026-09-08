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

export interface TechnicianInfo {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  city: string | null;
}

export interface CreateDemandeResult {
  id: string;
  reference: string;
  status: string;
  categoryId: string;
  categoryLabel: string;
  description: string;
  city: string;
  address: string | null;
  technicianId: string | null;
  technician: TechnicianInfo | null;
  scheduledAt: string | null;
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

export type DemandeListItem = CreateDemandeResult;

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

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (body as { message?: string | string[] } | null)?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    throw new ApiError(text ?? `Erreur ${res.status}`, res.status);
  }

  return body as T;
}

export async function createDemande(input: CreateDemandeInput): Promise<CreateDemandeResult> {
  const result = await apiFetch<CreateDemandeResult>('/demandes', {
    method: 'POST',
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

  return result;
}

export async function listMyDemandes(): Promise<DemandeListItem[]> {
  return apiFetch<DemandeListItem[]>('/demandes');
}

export async function getDemande(id: string): Promise<DemandeListItem> {
  return apiFetch<DemandeListItem>(`/demandes/${encodeURIComponent(id)}`);
}

export async function updateDemandeStatus(id: string, status: string): Promise<DemandeListItem> {
  return apiFetch<DemandeListItem>(`/demandes/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}
