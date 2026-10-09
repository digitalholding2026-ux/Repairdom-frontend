/* RÈGLES DU PARRAINAGE — module PUR, sans aucun import.
 *
 * Ce fichier ne dépend de RIEN (ni React, ni `fetch`, ni l'alias `@/`), à
 * l'instar de `saspay-fees.ts` : c'est ce qui le rend exécutable sous
 * `node --test`, le runner du dépôt ne résolvant pas l'alias `@/`. Le service
 * réseau (`api/referrals-service.ts`) l'importe ; aucun test n'a à charger ce
 * service.
 *
 * Les montants sont des ENTIERS XAF ; le formatage FCFA est fait à
 * l'affichage par `formatFCFA`, jamais ici.
 */

/** Préfixe affiché dans l'interface : « RELIO-A7K2M ». */
export const REFERRAL_CODE_PREFIX = 'RELIO-';

/**
 * Alphabet des codes — DOUBLON de `backend/src/referrals/referrals.config.ts`.
 *
 * Cinq caractères en sont exclus : `0`, `1`, `I`, `L`, `O`. Ce sont les
 * confusions réelles de lecture à voix haute (« zéro ou O », « un ou I », « un
 * ou L ») : un code se dicte au téléphone. Le test
 * `referrals-frontend.test.ts` compare les deux implémentations pour que la
 * divergence se voie dans la suite.
 */
export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Montant crédité au PARRAIN, XAF entier. */
export const REFERRAL_REWARD_XAF = 500;

/** Montant crédité au FILLEUL, XAF entier. */
export const REFERRAL_WELCOME_XAF = 500;

/** Nombre maximum de filleuls rewarded ou registered par parrain. */
export const REFERRAL_MAX_REFERRALS = 5;

/** États d'un parrainage, alignés sur l'enum Prisma `ReferralStatus`. */
export type ReferralStatus = 'PENDING' | 'REGISTERED' | 'REWARDED' | 'EXPIRED';

export interface ReferralRow {
  id: string;
  /** `null` tant que le filleul n'a pas créé son compte. */
  referredName: string | null;
  referredEmail: string | null;
  status: ReferralStatus;
  createdAt: string;
  rewardedAt: string | null;
}

export interface MyReferrals {
  code: string;
  shareUrl: string;
  maxReferrals: number;
  usedSlots: number;
  rewardedCount: number;
  referrals: ReferralRow[];
}

/** Format canonique : `RELIO-` + 5 caractères de l'alphabet. */
const REFERRAL_CODE_PATTERN = /^RELIO-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;

/**
 * Le code est-il syntaxiquement valide ? (`null`/`undefined` → `false`).
 * Comparaison INSENSIBLE à la casse : un code partagé en majuscules doit
 * fonctionner saisi en minuscules.
 */
export function isValidReferralCode(raw: string | null | undefined): boolean {
  return typeof raw === 'string' && REFERRAL_CODE_PATTERN.test(raw.trim().toUpperCase());
}

/**
 * Message d'erreur pour une saisie invalide, ou `null` si elle est valide.
 *
 * Distingue « vide » (rien à signaler : le champ est facultatif) de « mal
 * formée » : afficher une erreur sur un champ que l'utilisateur n'a pas encore
 * rempli serait du bruit.
 */
export function referralCodeError(raw: string): string | null {
  if (!raw.trim()) return null;
  return isValidReferralCode(raw)
    ? null
    : 'Code invalide : le format attendu est RELIO- suivi de 5 caractères.';
}

/** Lit le code de parrainage dans l'URL (`?ref=…`), normalisé, ou `null`. */
export function referralCodeFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get('ref');
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase();
  return normalized || null;
}

/** Libellé lisible d'un statut de parrainage. */
export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  PENDING: 'Lien partagé',
  REGISTERED: 'Inscrit',
  REWARDED: 'Récompensé',
  EXPIRED: 'Non éligible',
};

/** Un statut expire-t-il sans jamais donner lieu à une récompense ? */
export function isReferralExpired(status: ReferralStatus): boolean {
  return status === 'EXPIRED';
}