import {
  isDraftCreatable,
  type CreateDemandeDraftPayload,
} from '@/lib/api/request-service';
import type { RequestTimingMode } from '@/lib/request-timing';

/* Chantier D2 — fonctions PURES du brouillon (aucun état, aucun réseau).
 *
 * Isolées de `DemandeWizard` (1216 lignes) pour deux raisons : le wizard reste
 * lisible, et la logique de synchronisation devient TESTABLE par `node --test`
 * sans DOM ni rendu React — ce que les tests existants du dépôt ne peuvent pas
 * faire pour un composant.
 *
 * Rappel du contrat : le backend refuse `medias` dans un brouillon (400) et
 * exige `description` (10 car. min) + `city` non vide + `categoryId` valide.
 * Toute la stratégie de synchronisation découle de ces trois règles. */

export interface WizardDraftFields {
  categoryId: string;
  domainId: string;
  brandId: string;
  equipmentFamily: string;
  description: string;
  city: string;
  neighborhood: string;
  address: string;
  landmark: string;
  contactPhone: string;
  latitude: number | null;
  longitude: number | null;
  requestedMode: RequestTimingMode;
  requestedAtIso: string | null;
  /* `OTHER_DOMAIN` : le parcours « Autre appareil » n'a pas de marque. */
  isOtherDomain: boolean;
}

/** Projette l'état du wizard vers le contrat du brouillon. */
export function toDraftPayload(fields: WizardDraftFields): CreateDemandeDraftPayload {
  return {
    categoryId: fields.categoryId || 'autre',
    description: fields.description.trim(),
    city: fields.city.trim(),
    /* `domainId` est déjà mis à '' par le wizard sur le parcours
     * « Autre appareil » : on ne le renvoie donc jamais vide. `brandId` suit la
     * même règle, et il est INDISPENSABLE : sans lui, un visiteur anonyme qui
     * reprend son brouillon se retrouverait à l'étape 0 sans marque choisie,
     * donc avec `canContinue` bloqué — sa demande serait inatteignable. */
    ...(fields.domainId ? { domainId: fields.domainId } : {}),
    ...(fields.brandId ? { brandId: fields.brandId } : {}),
    ...(fields.isOtherDomain && fields.equipmentFamily.trim()
      ? { equipmentFamily: fields.equipmentFamily.trim() }
      : {}),
    ...(fields.neighborhood.trim() ? { neighborhood: fields.neighborhood.trim() } : {}),
    ...(fields.address.trim() ? { address: fields.address.trim() } : {}),
    ...(fields.landmark.trim() ? { landmark: fields.landmark.trim() } : {}),
    ...(fields.contactPhone.trim() ? { contactPhone: fields.contactPhone.trim() } : {}),
    ...(typeof fields.latitude === 'number' && Number.isFinite(fields.latitude)
      ? { latitude: fields.latitude }
      : {}),
    ...(typeof fields.longitude === 'number' && Number.isFinite(fields.longitude)
      ? { longitude: fields.longitude }
      : {}),
    requestedMode: fields.requestedMode,
    ...(fields.requestedAtIso ? { requestedAt: fields.requestedAtIso } : {}),
  };
}

/** Le brouillon peut-il être créé maintenant ? (= le DTO backend l'accepterait) */
export function canCreateDraft(fields: WizardDraftFields): boolean {
  return isDraftCreatable({
    categoryId: fields.categoryId || 'autre',
    description: fields.description,
    city: fields.city,
  });
}

/** Champs réellement modifiés depuis la dernière synchronisation réussie.
 *
 * NUL si rien n'a bougé : évite un PATCH inutile toutes les 800 ms.
 *
 * Volontairement asymétrique sur les effacements : un champ qui DISPARAÎT du
 * payload (saisie vidée) est renvoyé avec la chaîne vide, pour que le backend
 * applique bien la suppression. Sans cela, vider un champ ne l'annulerait jamais
 * dans la valeur enregistrée côté brouillon. */
export function diffDraftPayload(
  previous: Partial<CreateDemandeDraftPayload> | null,
  next: CreateDemandeDraftPayload,
): Partial<CreateDemandeDraftPayload> {
  if (!previous) return next;
  const changed: Record<string, unknown> = {};
  const before_ = previous as Record<string, unknown>;
  const after_ = next as unknown as Record<string, unknown>;
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    const before = before_[key];
    const after = after_[key];
    if (after === undefined) {
      /* Champ effacé côté wizard : on l'envoie vide pour le neutraliser.
       * `requestedMode` n'est jamais effacé (valeur par défaut). */
      if (before !== undefined) changed[key] = '';
      continue;
    }
    if (before !== after) changed[key] = after;
  }
  return changed as Partial<CreateDemandeDraftPayload>;
}

/** Reprojette un brouillon relu du backend vers l'état du wizard.
 *
 * Le backend ne renvoie PAS `medias` (par construction) : les médias déjà
 * sélectionnés restent dans l'état local du composant, ils ne sont pas
 * restaurés — c'est le comportement attendu, les octets vivaient dans des
 * objets `File` non sérialisables.
 *
 * Rappel : le brouillon ne mémorise PAS l'étape. La reprise repart de l'étape 0
 * — voir `src/lib/demande-draft-storage.ts`. */
export function draftToWizardFields(data: {
  categoryId?: string;
  domainId?: string | null;
  brandId?: string | null;
  equipmentFamily?: string | null;
  description?: string;
  city?: string;
  neighborhood?: string | null;
  address?: string | null;
  landmark?: string | null;
  contactPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  requestedMode?: string | null;
  requestedAt?: string | null;
}): Partial<WizardDraftFields> {
  const domainId = data.domainId ?? '';
  /* `OTHER_DOMAIN` est une constante PRIVÉE du wizard (`'__other__'`) : un
   * brouillon n'a pas de domaine dans ce cas. On le signale par l'absence de
   * `domainId` + la présence d'une famille. */
  const isOtherDomain = domainId === '' && Boolean(data.equipmentFamily);
  return {
    categoryId: data.categoryId ?? 'autre',
    domainId,
    brandId: data.brandId ?? '',
    equipmentFamily: data.equipmentFamily ?? '',
    description: data.description ?? '',
    city: data.city ?? '',
    neighborhood: data.neighborhood ?? '',
    address: data.address ?? '',
    landmark: data.landmark ?? '',
    contactPhone: data.contactPhone ?? '',
    latitude: typeof data.latitude === 'number' ? data.latitude : null,
    longitude: typeof data.longitude === 'number' ? data.longitude : null,
    requestedMode: (data.requestedMode === 'SCHEDULED' ? 'SCHEDULED' : 'ASAP') as RequestTimingMode,
    requestedAtIso: data.requestedAt ?? null,
    isOtherDomain,
  };
}