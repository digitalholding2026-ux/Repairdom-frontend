/* IA-9 — aides pures du dashboard IA admin (aucun appel réseau, aucune
 * logique métier : libellés factuels, jamais de score global de risque). */

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const CLASSIFICATION_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  CLASSIFIED: { label: 'Classifié', variant: 'success' },
  UNCERTAIN: { label: 'Incertain', variant: 'warning' },
  UNCLASSIFIABLE: { label: 'Non classifiable', variant: 'neutral' },
  MATCHED: { label: 'Apparié', variant: 'success' },
  UNMATCHED: { label: 'Non apparié', variant: 'neutral' },
};

const PRICING_RESULT_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  NORMAL: { label: 'Normal', variant: 'success' },
  ABOVE_MAX: { label: 'Au-dessus du max', variant: 'warning' },
  BELOW_MIN: { label: 'Sous le min', variant: 'info' },
  UNCERTAIN: { label: 'Incertain', variant: 'warning' },
  NO_BAREME: { label: 'Sans barème', variant: 'neutral' },
};

const WARNING_STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: 'En attente', variant: 'warning' },
  JUSTIFIED: { label: 'Justifié', variant: 'success' },
  EXPIRED: { label: 'Délai dépassé', variant: 'info' },
  REVIEWED: { label: 'Examiné', variant: 'neutral' },
};

const FLAG_STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  OPEN: { label: 'Ouvert', variant: 'warning' },
  REVIEWED: { label: 'Examiné', variant: 'neutral' },
  DISMISSED: { label: 'Écarté', variant: 'success' },
};

const SEVERITY_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  LOW: { label: 'Basse', variant: 'neutral' },
  MEDIUM: { label: 'Moyenne', variant: 'info' },
  HIGH: { label: 'Haute', variant: 'danger' },
};

const CATEGORY_LABELS: Record<string, string> = {
  OFF_PLATFORM_PAYMENT: 'Paiement hors plateforme',
  OFF_PLATFORM_CONTACT: 'Contact hors plateforme',
  CONVERSATION_INCONSISTENCY: 'Incohérence',
  PRICE_DISCREPANCY: 'Écart de prix',
  POTENTIAL_FRAUD: 'Fraude potentielle',
  ABUSIVE_OR_PRESSURING_BEHAVIOR: 'Pression / abus',
  OTHER: 'Autre',
};

export function signalBadge(group: 'classification' | 'pricing' | 'warning' | 'flag' | 'severity', value: string): {
  label: string;
  variant: BadgeVariant;
} {
  const fallback = { label: value, variant: 'neutral' as BadgeVariant };
  switch (group) {
    case 'classification':
      return CLASSIFICATION_LABELS[value] ?? fallback;
    case 'pricing':
      return PRICING_RESULT_LABELS[value] ?? fallback;
    case 'warning':
      return WARNING_STATUS_LABELS[value] ?? fallback;
    case 'flag':
      return FLAG_STATUS_LABELS[value] ?? fallback;
    case 'severity':
      return SEVERITY_LABELS[value] ?? fallback;
    default:
      return fallback;
  }
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/* Niveau de surveillance IA-7 : explication factuelle (niveau 3 =
 * réexamen humain requis, jamais une suspension, jamais un score). */
export function surveillanceLevelText(level: number): string {
  switch (level) {
    case 0:
      return 'Niveau 0 — aucun signal tarifaire enregistré.';
    case 1:
      return 'Niveau 1 — premier avertissement tarifaire.';
    case 2:
      return 'Niveau 2 — surveillance renforcée (récidive).';
    default:
      return 'Niveau 3 — réexamen humain requis (jamais une suspension automatique).';
  }
}

export const AI_PAGE_SIZE = 20;
