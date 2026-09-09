import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';

export const KYC_LABELS: Record<string, string> = {
  NOT_SUBMITTED: 'Identité non vérifiée',
  PENDING: 'Vérification en cours',
  VERIFIED: 'Identité vérifiée par RepairDom',
  REJECTED: 'Vérification à compléter',
};

export const KYC_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'danger' | 'neutral'> = {
  NOT_SUBMITTED: 'neutral',
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
};

export function kycStatusLabel(status: string): string {
  return KYC_LABELS[status] ?? KYC_LABELS.NOT_SUBMITTED;
}

export function kycVariantFor(status: string): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  return KYC_VARIANTS[status] ?? KYC_VARIANTS.NOT_SUBMITTED;
}

export function kycIsVerified(status: string): boolean {
  return status === 'VERIFIED';
}

export function categoryLabel(id: string): string {
  return REQUEST_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function technicianInitials(firstName: string, lastName: string | null): string {
  const parts = [firstName, lastName ?? ''].filter(Boolean);
  return parts
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}