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

/* ── Back-office « Finances RepairDom » ──────────────────────── */

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
    expectedPerMission: number;
  };
}

export interface AdminFinanceSummary {
  currency: string;
  expectedPerMission: { clientFee: number; technicianFee: number; total: number };
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