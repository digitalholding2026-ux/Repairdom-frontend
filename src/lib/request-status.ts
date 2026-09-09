export type StatusVariant = 'info' | 'warning' | 'success' | 'danger' | 'neutral';

export const DEMANDE_STATUSES = [
  'SUBMITTED',
  'PENDING',
  'ACCEPTED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CONFIRMED',
  'CANCELED',
] as const;

export type DemandeStatus = (typeof DEMANDE_STATUSES)[number];

export const DEMANDE_STATUS_CONFIG: Record<
  DemandeStatus,
  { label: string; variant: StatusVariant }
> = {
  SUBMITTED: { label: 'Recherche de technicien', variant: 'info' },
  PENDING: { label: 'En attente', variant: 'warning' },
  ACCEPTED: { label: 'Technicien trouvé', variant: 'success' },
  SCHEDULED: { label: 'Rendez-vous fixé', variant: 'info' },
  IN_PROGRESS: { label: 'Intervention en cours', variant: 'warning' },
  COMPLETED: { label: 'Intervention terminée', variant: 'info' },
  CONFIRMED: { label: 'Confirmée', variant: 'success' },
  CANCELED: { label: 'Annulée', variant: 'danger' },
};

export function demandeStatusConfig(status: string | null | undefined): {
  label: string;
  variant: StatusVariant;
} {
  if (status && status in DEMANDE_STATUS_CONFIG) return DEMANDE_STATUS_CONFIG[status as DemandeStatus];
  return { label: status ?? '—', variant: 'neutral' };
}

export const QUOTE_STATUS_CONFIG: Record<string, { label: string; variant: StatusVariant }> = {
  PENDING: { label: 'En attente de validation', variant: 'warning' },
  ACCEPTED: { label: 'Devis accepté', variant: 'success' },
  REJECTED: { label: 'Devis refusé', variant: 'danger' },
};

export function quoteStatusConfig(status: string | null | undefined): {
  label: string;
  variant: StatusVariant;
} {
  if (status && status in QUOTE_STATUS_CONFIG) return QUOTE_STATUS_CONFIG[status];
  return { label: status ?? '—', variant: 'neutral' };
}