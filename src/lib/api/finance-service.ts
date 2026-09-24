import { siteConfig } from '@/lib/site-config';

/* ── Espace client « Mon solde » ─────────────────────────────── */

export type FinancialDirection = 'CREDIT' | 'DEBIT';
export type FinancialTransactionStatus = 'VALIDATED' | 'PENDING' | 'FAILED' | 'REVERSED';
export type FinancialMode = 'SIMULATION' | 'REAL';

export interface ClientFinanceMission {
  demandeId: string;
  reference: string;
  status: string;
  scheduledAt: string | null;
  repair: number;
  travel: number;
  fee: number;
  totalDebit: number;
  refunded: boolean;
  refundAmount: number;
}

export interface ClientFinanceTransaction {
  id: string;
  type: string;
  direction: FinancialDirection;
  amount: number;
  status: FinancialTransactionStatus;
  mode: FinancialMode;
  reference: string;
  reversalOfId: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  demande: {
    id: string;
    reference: string;
    status: string;
    scheduledAt: string | null;
  } | null;
}

export interface ClientFinanceSummary {
  mode: FinancialMode;
  currency: string;
  balance: number;
  totals: { credit: number; debit: number; net: number };
  missions: ClientFinanceMission[];
  transactions: ClientFinanceTransaction[];
}

/* ── Espace technicien « Mes revenus » ───────────────────────── */

export interface TechnicianMissionFinance {
  demandeId: string;
  reference: string;
  status: string;
  scheduledAt: string | null;
  settledAt: string | null;
  repair: number;
  travel: number;
  fees: number;
  gross: number;
  net: number;
}

export interface TechnicianShortPerson {
  id: string;
  firstName: string;
  lastName: string;
}

export interface TechnicianFinanceTransaction {
  id: string;
  type: string;
  direction: FinancialDirection;
  amount: number;
  status: FinancialTransactionStatus;
  mode: FinancialMode;
  reference: string;
  reversalOfId: string | null;
  createdAt: string;
  demande: {
    id: string;
    reference: string;
    status: string;
    scheduledAt: string | null;
    client: TechnicianShortPerson | null;
  } | null;
}

export interface TechnicianFinanceSummary {
  mode: FinancialMode;
  currency: string;
  grossRevenue: number;
  repairRevenue: number;
  travelRevenue: number;
  platformFees: number;
  netRevenue: number;
  available: number;
  missions: TechnicianMissionFinance[];
  transactions: TechnicianFinanceTransaction[];
}

/* ── Back-office « Finances Relio » ─────────────────────────── */

export interface AdminFinancePerson {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AdminFinanceMission {
  demandeId: string;
  reference: string | null;
  status: string | null;
  date: string | null;
  client: AdminFinancePerson | null;
  technician: AdminFinancePerson | null;
  repair: number;
  travel: number;
  clientDebit: number;
  clientFee: number;
  technicianFee: number;
  technicianNet: number;
  repairDomRevenue: number;
  reconciled: boolean;
  lastActivity: string;
}

export interface AdminFinanceModeResult {
  mode: FinancialMode;
  totals: {
    missionsCount: number;
    transactionsCount: number;
    hasAnyFinancialTransaction: boolean;
    repair: number;
    travel: number;
    clientFees: number;
    technicianFees: number;
    repairDomRevenue: number;
    technicianGross: number;
    technicianNet: number;
    clientDebits: number;
  };
  missions: AdminFinanceMission[];
  reconciliation: {
    missionsCount: number;
    reconciledMissions: number;
    mismatchMissions: number;
    ok: boolean | null;
    expectedPerMission: {
      transport: number;
      commissionRateNumerator: number;
      commissionRateDenominator: number;
      legacyTotal: number;
    };
  };
}

export interface AdminFinanceSummary {
  currency: string;
  expectedPerMission: {
    transport: number;
    commissionRateNumerator: number;
    commissionRateDenominator: number;
    clientFee: number;
    technicianFee: number;
    total: number;
  };
  results: Record<FinancialMode, AdminFinanceModeResult>;
}

export interface AdminMissionFinance {
  demande: {
    id: string;
    reference: string;
    status: string;
    createdAt: string;
    finalAmount: number | null;
    client: AdminFinancePerson | null;
    technician: AdminFinancePerson | null;
  };
  quote: {
    id: string;
    amount: number;
    currency: string;
    createdAt: string;
    repair: number;
    travel: number;
  } | null;
  financials: {
    clientMissionDebit: number;
    clientFee: number;
    technicianRepair: number;
    technicianTravel: number;
    technicianFee: number;
    netTechnician: number;
    repairDomRevenue: number;
    expectedRepairDomRevenue: number;
    reconciled: boolean;
    clientRefunded: boolean;
    clientRefundAmount: number;
  };
  transactions: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    } | null;
    demandeId: string | null;
    type: string;
    direction: FinancialDirection;
    amount: number;
    status: FinancialTransactionStatus;
    mode: FinancialMode;
    reference: string;
    reversalOfId: string | null;
    createdAt: string;
  }>;
}

/* ── Client API ───────────────────────────────────────────────── */

class ApiError extends Error {
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

export async function getClientFinanceSummary(): Promise<ClientFinanceSummary> {
  return apiFetch<ClientFinanceSummary>('/finances/client/me');
}

export async function getTechnicianFinanceSummary(): Promise<TechnicianFinanceSummary> {
  return apiFetch<TechnicianFinanceSummary>('/finances/technician/me');
}

export interface AdminFinanceQuery {
  mode?: FinancialMode;
  from?: string;
  to?: string;
  reference?: string;
}

export async function getAdminFinanceSummary(
  query: AdminFinanceQuery = {},
): Promise<AdminFinanceSummary> {
  const params = new URLSearchParams();
  if (query.mode) params.set('mode', query.mode);
  if (query.from) params.set('from', new Date(query.from).toISOString());
  if (query.to) params.set('to', new Date(query.to).toISOString());
  if (query.reference?.trim()) params.set('reference', query.reference.trim());

  const qs = params.toString();
  return apiFetch<AdminFinanceSummary>(`/admin/finances${qs ? `?${qs}` : ''}`);
}

export async function getAdminMissionFinance(demandeId: string): Promise<AdminMissionFinance> {
  return apiFetch<AdminMissionFinance>(
    `/admin/finances/missions/${encodeURIComponent(demandeId)}`,
  );
}

/* ── Fonds Relio + retraits (Sprint ADMIN SUPER POWERS) ─────── */

export interface RelioFundsSummary {
  mode: FinancialMode;
  currency: string;
  acquired: number;
  withdrawn: number;
  available: number;
  withdrawalsCount: number;
}

export interface RelioWithdrawal {
  id: string;
  reference: string;
  amount: number;
  note: string | null;
  mode: FinancialMode;
  status: string;
  requestedBy: { id: string; firstName: string; lastName: string | null };
  createdAt: string;
}

export interface RelioWithdrawalResult extends RelioWithdrawal {
  availableAfter: number;
}

export async function getRelioFundsSummary(): Promise<RelioFundsSummary> {
  return apiFetch<RelioFundsSummary>('/admin/finances/relio-funds/summary');
}

export async function listRelioWithdrawals(): Promise<{ items: RelioWithdrawal[] }> {
  return apiFetch<{ items: RelioWithdrawal[] }>('/admin/finances/relio-funds/withdrawals');
}

export async function withdrawRelioFunds(amount: number, note?: string): Promise<RelioWithdrawalResult> {
  return apiFetch<RelioWithdrawalResult>('/admin/finances/relio-funds/withdrawals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, note: note?.trim() || undefined }),
  });
}

/* ── Crédit initial simulateur (ADMIN uniquement) ─────────────── */

export interface TestCreditTransaction {
  id: string;
  amount: number;
  reference: string;
  createdAt: string;
}

export interface TestCreditResult {
  userId: string;
  created: boolean;
  alreadyCredited: boolean;
  transaction: TestCreditTransaction;
  balance: number;
}

/** Crédite un compte client de test (simulation). Idempotent côté backend. */
export async function createTestCredit(
  userId: string,
  amount: number,
): Promise<TestCreditResult> {
  return apiFetch<TestCreditResult>('/admin/dev/test-credit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount }),
  });
}

/* ―― Recharge client via SasPay (pay-in) ――――――――――――――――――――――――――――
 * Le retour SasPay ne prouve jamais rien : seul le statut Relio
 * (getTopupIntent) fait foi, alimenté par webhook/vérification serveur. */

export type TopupIntentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type TopupNetwork = 'mtn_cm' | 'orange_cm';

export interface TopupIntent {
  id: string;
  reference: string;
  userId: string;
  amount: number;
  currency: string;
  mode: FinancialMode;
  status: TopupIntentStatus;
  saspayTransactionId: string | null;
  saspayReference: string | null;
  externalReference: string | null;
  network: string | null;
  country: string | null;
  requestedAmount: number | null;
  fee: number | null;
  chargedAmount: number | null;
  netAmount: number | null;
  creditedTransactionId: string | null;
  errorMessage: string | null;
  /** Message utilisateur sûr calculé côté backend (l'UI ne lit jamais
   *  errorMessage, réservé aux logs). */
  userMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTopupIntentInput {
  amount: number;
  idempotencyKey?: string;
  network?: TopupNetwork;
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface TopupPaymentError {
  code: string;
  message: string;
}

export interface CreateTopupIntentResult {
  intent: TopupIntent;
  saspayEnabled: boolean;
  checkoutUrl: string | null;
  pushSent?: boolean;
  saspayStatus?: string;
  saspayTransactionId?: string | null;
  note?: string | null;
  /** Renseigné quand le paiement est refusé à l'init (intention FAILED,
   *  aucun débit) — réponse 201, pas d'exception. */
  paymentError?: TopupPaymentError | null;
}

/** Crée une intention de recharge (et initialise le paiement en REAL).
 *  `checkoutUrl` non vide → rediriger le client ; sinon push USSD. */
export async function createTopupIntent(
  input: CreateTopupIntentInput,
): Promise<CreateTopupIntentResult> {
  return apiFetch<CreateTopupIntentResult>('/finances/topup/intents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function listTopupIntents(): Promise<{ items: TopupIntent[] }> {
  return apiFetch<{ items: TopupIntent[] }>('/finances/topup/intents');
}

/** Statut réel Relio d'une intention (source de vérité après retour SasPay). */
export async function getTopupIntent(reference: string): Promise<{ intent: TopupIntent }> {
  return apiFetch<{ intent: TopupIntent }>(
    `/finances/topup/intents/${encodeURIComponent(reference)}`,
  );
}

export interface VerifyTopupResult {
  intent: TopupIntent | null;
  saspayStatus: string | null;
  /** Renseigné quand la vérification serveur n'a pas abouti (l'intention
   *  reste PENDING pour re-vérification) — réponse 200, pas d'exception. */
  verificationError?: TopupPaymentError | null;
}

/** Vérification serveur on-demand (sans polling agressif). */
export async function verifyTopupIntent(reference: string): Promise<VerifyTopupResult> {
  return apiFetch<VerifyTopupResult>(
    `/finances/topup/intents/${encodeURIComponent(reference)}/verify`,
    { method: 'POST' },
  );
}

/* ―― Retrait client/technicien via SasPay (payout) ―――――――――――――――――――
 * Même endpoint pour les deux rôles (JWT) : POST /finances/withdrawals.
 * Le débit définitif n'existe qu'au SUCCESS confirmé serveur ; les frais
 * sont appliqués par SasPay (jamais calculés ici). */

export type WithdrawalRequestStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type WithdrawalNetwork = 'mtn_cm' | 'orange_cm';

export interface WithdrawalRequest {
  id: string;
  reference: string;
  userId: string;
  amount: number;
  currency: string;
  mode: FinancialMode;
  status: WithdrawalRequestStatus;
  holdId: string | null;
  ledgerReference: string | null;
  saspayTransactionId: string | null;
  saspayReference: string | null;
  externalReference: string | null;
  network: string | null;
  country: string | null;
  requestedAmount: number | null;
  fee: number | null;
  chargedAmount: number | null;
  netAmount: number | null;
  errorMessage: string | null;
  /** Message utilisateur sûr calculé côté backend. */
  userMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithdrawalRequestInput {
  amount: number;
  idempotencyKey?: string;
  network?: WithdrawalNetwork;
  msisdn?: string;
}

export interface CreateWithdrawalRequestResult {
  request: WithdrawalRequest;
  saspayEnabled: boolean;
  saspayTransactionId?: string | null;
  paymentError?: TopupPaymentError | null;
  note?: string | null;
}

/** Crée une demande de retrait (hold + PENDING, init payout en REAL). */
export async function createWithdrawalRequest(
  input: CreateWithdrawalRequestInput,
): Promise<CreateWithdrawalRequestResult> {
  return apiFetch<CreateWithdrawalRequestResult>('/finances/withdrawals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function listWithdrawalRequests(): Promise<{ items: WithdrawalRequest[] }> {
  return apiFetch<{ items: WithdrawalRequest[] }>('/finances/withdrawals');
}

/** Statut réel Relio d'une demande (source de vérité). */
export async function getWithdrawalRequest(reference: string): Promise<{ request: WithdrawalRequest }> {
  return apiFetch<{ request: WithdrawalRequest }>(
    `/finances/withdrawals/${encodeURIComponent(reference)}`,
  );
}

export interface VerifyWithdrawalResult {
  request: WithdrawalRequest | null;
  saspayStatus: string | null;
  verificationError?: TopupPaymentError | null;
}

/** Vérification serveur on-demand (sans polling agressif). */
export async function verifyWithdrawalRequest(reference: string): Promise<VerifyWithdrawalResult> {
  return apiFetch<VerifyWithdrawalResult>(
    `/finances/withdrawals/${encodeURIComponent(reference)}/verify`,
    { method: 'POST' },
  );
}