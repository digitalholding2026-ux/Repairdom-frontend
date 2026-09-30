import { siteConfig } from '@/lib/site-config';

/* IA-7 — avertissements tarifaires du technicien connecté (lecture +
 * justification). Message backend factuel : écart au barème, 48 h,
 * poursuite normale — jamais une sanction. */

export type AiWarningStatus = 'PENDING' | 'JUSTIFIED' | 'EXPIRED' | 'REVIEWED';

export interface AiWarningPricing {
  proposedPrice: number;
  minAtCheck: number | null;
  referenceAtCheck: number | null;
  maxAtCheck: number | null;
  result: string;
  deviationAmount: number | null;
  deviationBps: number | null;
}

export interface AiWarning {
  id: string;
  warningType: string;
  status: AiWarningStatus;
  storedStatus: string;
  dueAt: string;
  justification: string | null;
  justifiedAt: string | null;
  isLateJustification: boolean;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  quoteId: string;
  demandeId: string;
  diagnosticId: string | null;
  pricingCheckId: string;
  pricing: AiWarningPricing | null;
  demande: { id: string; reference: string; status: string } | null;
  quote: { id: string; amount: number; currency: string; status: string } | null;
}

export class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? null;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${siteConfig.apiBaseUrl}${path}`, {
    credentials: 'include',
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const payload = body as { message?: string | string[]; code?: string } | null;
    const message = payload?.message;
    const text = Array.isArray(message) ? message.join(', ') : message;
    const code = typeof payload?.code === 'string' ? payload.code : null;
    throw new ApiError(text ?? `Erreur ${res.status}`, res.status, code);
  }
  return body as T;
}

export async function listMyAiWarnings(): Promise<AiWarning[]> {
  return apiFetch<AiWarning[]>('/technician/ai-warnings');
}

export async function justifyAiWarning(id: string, text: string): Promise<AiWarning> {
  return apiFetch<AiWarning>(`/technician/ai-warnings/${encodeURIComponent(id)}/justify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.trim() }),
  });
}
