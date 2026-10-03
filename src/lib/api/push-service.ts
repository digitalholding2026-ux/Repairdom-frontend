import { apiFetch } from './auth-service';

/* Contrats push web (backend `/api/push`). Montants éventuels déjà
 * formatés côté serveur (FCFA) — aucun formatage ici. */

export interface BrowserPushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function getVapidPublicKey(): Promise<{ publicKey: string | null }> {
  return apiFetch<{ publicKey: string | null }>('/push/vapid-public-key');
}

export async function sendPushSubscription(input: {
  subscription: BrowserPushSubscriptionPayload;
  userAgent?: string;
  deviceLabel?: string;
}): Promise<{ id: string }> {
  return apiFetch<{ id: string }>('/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function sendPushUnsubscribe(endpoint: string): Promise<void> {
  await apiFetch<void>('/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
}

export async function sendPushTest(): Promise<{ sent: number; skipped: string | null; failed: number }> {
  return apiFetch<{ sent: number; skipped: string | null; failed: number }>('/push/test', {
    method: 'POST',
  });
}
