import type { StatusVariant } from '@/lib/request-status';

/* Litige post-intervention — libellés FR centralisés (source d'affichage
 * uniquement : catégories, statuts et transitions viennent du backend). */

export const DISPUTE_CATEGORIES = ['QUALITY', 'INCOMPLETE', 'PRICING', 'BEHAVIOR', 'OTHER'] as const;

export type DisputeCategory = (typeof DISPUTE_CATEGORIES)[number];

export const DISPUTE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'] as const;

export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_CATEGORY_LABELS: Record<DisputeCategory, string> = {
  QUALITY: 'Qualité du travail',
  INCOMPLETE: 'Travail incomplet',
  PRICING: 'Tarif contesté',
  BEHAVIOR: 'Comportement',
  OTHER: 'Autre',
};

export const DISPUTE_STATUS_CONFIG: Record<DisputeStatus, { label: string; variant: StatusVariant }> = {
  OPEN: { label: 'Ouvert', variant: 'warning' },
  UNDER_REVIEW: { label: 'En examen', variant: 'info' },
  RESOLVED: { label: 'Résolu (fondé)', variant: 'success' },
  REJECTED: { label: 'Rejeté', variant: 'neutral' },
};

export function disputeStatusConfig(status: string | null | undefined): {
  label: string;
  variant: StatusVariant;
} {
  if (status && status in DISPUTE_STATUS_CONFIG) {
    return DISPUTE_STATUS_CONFIG[status as DisputeStatus];
  }
  return { label: status ?? '—', variant: 'neutral' };
}

export function disputeCategoryLabel(category: string | null | undefined): string {
  if (category && category in DISPUTE_CATEGORY_LABELS) {
    return DISPUTE_CATEGORY_LABELS[category as DisputeCategory];
  }
  return category ?? '—';
}

/* Longueurs miroir backend (validation affichée, jamais de logique métier). */
export const DISPUTE_DESCRIPTION_MIN = 10;
export const DISPUTE_DESCRIPTION_MAX = 2000;
