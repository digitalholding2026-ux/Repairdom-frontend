/* Libellés et helpers d'AFFICHAGE du profil technicien.
 *
 * Les règles métier pures (majorité, faces de pièce, structures d'énum) sont
 * dans `technician-kyc-rules.ts` : ce fichier n'ajoute que la présentation et
 * les quelques correspondances qui dépendent du reste du dépôt (catégories,
 * nationalités). Rien n'est défini deux fois. */

import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import type { TechnicianActivityType } from '@/lib/api/technician-service';
import {
  ACTIVITY_TYPE_LABELS,
  IDENTITY_DOCUMENT_LABELS,
  IDENTITY_SIDE_LABELS,
  KYC_LABELS,
  KYC_VARIANTS,
  activityTypeLabel,
  computeAge,
  identityDocumentLabel,
  identityDocumentSideLabel,
  isIdentityDocumentType,
  kycIsLocked,
  kycIsVerified,
  kycStatusLabel,
  kycVariantFor,
  meetsMinimumAge,
  requiredIdentitySides,
  TECHNICIAN_MINIMUM_AGE,
  MINIMUM_AGE_ERROR,
  type IdentitySide,
  type KycIdentityDocumentType,
  type KycStatus,
} from './technician-kyc-rules';

/* Ré-export pour les composants : une seule source d'import. */
export {
  ACTIVITY_TYPE_LABELS,
  IDENTITY_DOCUMENT_LABELS,
  IDENTITY_SIDE_LABELS,
  KYC_LABELS,
  KYC_VARIANTS,
  TECHNICIAN_MINIMUM_AGE,
  MINIMUM_AGE_ERROR,
  activityTypeLabel,
  computeAge,
  identityDocumentLabel,
  identityDocumentSideLabel,
  isIdentityDocumentType,
  kycIsLocked,
  kycIsVerified,
  kycStatusLabel,
  kycVariantFor,
  meetsMinimumAge,
  requiredIdentitySides,
};
export type { IdentitySide, KycIdentityDocumentType, KycStatus, TechnicianActivityType };

/** Libellé de face : accepte n'importe quelle chaîne (donnée serveur). */
export const KYC_DOCUMENT_SIDE_LABELS = IDENTITY_SIDE_LABELS;
export function kycDocumentSideLabel(side: string): string {
  return identityDocumentSideLabel(side);
}

export const KYC_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  IDENTITY: 'Pièce d’identité',
  PROFESSIONAL: 'Justificatif professionnel',
};

export function kycDocumentTypeLabel(type: string): string {
  return KYC_DOCUMENT_TYPE_LABELS[type] ?? type;
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

/**
 * Libellé d'un code ISO 3166-1 alpha-2 (nationalité), pour l'ADMIN.
 *
 * La nomenclature complète est servie par le backend
 * (`GET /catalog/nationalities`) : la recopier ici créerait une deuxième
 * source de vérité. On affiche donc le code, enrichi des quelques pays
 * fréquents où le nom lisible aide réellement à lire un dossier.
 */
const WELL_KNOWN_NATIONALITIES: Record<string, string> = {
  CM: 'Cameroun',
  FR: 'France',
  SN: 'Sénégal',
  CI: "Côte d'Ivoire",
  GA: 'Gabon',
  CG: 'Congo',
  CD: 'Congo (RDC)',
  BE: 'Belgique',
  ES: 'Espagne',
  IT: 'Italie',
  DE: 'Allemagne',
  GB: 'Royaume-Uni',
  US: 'États-Unis',
  CA: 'Canada',
};

export function typeLabelByCode(code: string | null): string | null {
  if (!code) return null;
  const known = WELL_KNOWN_NATIONALITIES[code.toUpperCase()];
  /* Jamais de liste « à moitié » présentée comme exhaustive : hors de ce court
   * dict, on affiche le code ISO, qui est la valeur réellement persistée. */
  return known ?? code.toUpperCase();
}