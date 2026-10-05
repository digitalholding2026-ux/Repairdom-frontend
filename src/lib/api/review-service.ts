import { siteConfig } from '@/lib/site-config';
import { toApiError } from './api-error';

export interface ReviewParty {
  id: string;
  firstName: string;
  lastName: string | null;
}

export interface Review {
  id: string;
  demandeId: string;
  authorId: string;
  targetId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: ReviewParty;
  target: ReviewParty;
}

export interface DemandeReviews {
  reviews: Review[];
  mine: Review | null;
}

export interface Reputation {
  averageRating: number | null;
  totalReviews: number;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res, body);
  return body as T;
}

export async function createDemandeReview(
  demandeId: string,
  data: { rating: number; comment?: string },
): Promise<Review> {
  return apiFetch<Review>(`/demandes/${encodeURIComponent(demandeId)}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rating: data.rating,
      comment: data.comment || undefined,
    }),
  });
}

export async function listDemandeReviews(demandeId: string): Promise<DemandeReviews> {
  return apiFetch<DemandeReviews>(`/demandes/${encodeURIComponent(demandeId)}/reviews`);
}

export async function getTechnicianReputation(id: string): Promise<Reputation> {
  return apiFetch<Reputation>(`/technicians/${encodeURIComponent(id)}/reputation`);
}

export async function getClientReputation(id: string): Promise<Reputation> {
  return apiFetch<Reputation>(`/clients/${encodeURIComponent(id)}/reputation`);
}

export function formatReputation(reputation: Reputation | null): string {
  if (!reputation || reputation.totalReviews === 0 || reputation.averageRating === null) {
    return 'Aucune évaluation';
  }
  return `⭐ ${reputation.averageRating.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} / 5 · ${reputation.totalReviews} évaluation${reputation.totalReviews > 1 ? 's' : ''}`;
}

export function fullName(party: ReviewParty): string {
  return [party.firstName, party.lastName].filter(Boolean).join(' ') || party.firstName;
}

export function reviewDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}