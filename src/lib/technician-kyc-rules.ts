/* Règles PURES du parcours technicien (KYC + majorité + compétences).
 *
 * Aucune dépendance, aucun alias `@/` : ce module est importable directement
 * par les tests Node natifs (`node --test`), qui ne résolvent pas les alias.
 * Suit exactement le même découpage que `guard-decision.ts`.
 *
 * Règle structurante : ces règles sont le MIROIR de celles du backend
 * (`technician/technician-age.ts`, `technician/identity-documents.ts`). Le
 * backend reste la source de vérité — il refuse une soumission incomplète ou
 * l'activation d'un mineur. Ces fonctions servent l'affichage et la guidance,
 * jamais la sécurité.
 */

/* ── Majorité (§11) ─────────────────────────────────────────────────────── */

/** Âge minimal pour exercer comme technicien (aligné sur le backend). */
export const TECHNICIAN_MINIMUM_AGE = 18;

/** Message d'erreur d'âge, aligné sur `TECHNICIAN_MINIMUM_AGE_MESSAGE`. */
export const MINIMUM_AGE_ERROR = `Vous devez avoir au moins ${TECHNICIAN_MINIMUM_AGE} ans pour exercer comme technicien sur Relio.`;

/** Âge révolu à la date de référence, calculé sur la date COMPLÈTE.
 *
 *  INTERDIT : `année courante - année de naissance`. Le mois puis le jour
 *  sont comparés, sinon un mineur serait accepté plusieurs mois avant son
 *  18e anniversaire.
 *
 *  FUSEAU : on raisonne en UTC, comme le backend (`technician-age.ts`). Les
 *  deux implémentations doivent coïncider à l'instant près, sinon le
 *  formulaire peut afficher « vous devez avoir 18 ans » pour quelqu'un que le
 *  backend considère majeur, ou l'inverse. Le décalage de fuseau ne doit donc
 *  jamais décider de la majorité. */
export function computeAge(birthDate: string | null, today: Date = new Date()): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split('-').map(Number);
  if (!year || !month || !day) return null;
  let age = today.getUTCFullYear() - year;
  const monthDelta = today.getUTCMonth() + 1 - month;
  if (monthDelta < 0 || (monthDelta === 0 && today.getUTCDate() < day)) age -= 1;
  return age >= 0 ? age : null;
}

/** Le technicien a-t-il l'âge requis ? `false` si la date est absente :
 *  l'absence de donnée ne vaut jamais autorisation. */
export function meetsMinimumAge(birthDate: string | null, today: Date = new Date()): boolean {
  const age = computeAge(birthDate, today);
  return age !== null && age >= TECHNICIAN_MINIMUM_AGE;
}

/* ── Pièce d'identité et faces (§14 / §15) ─────────────────────────────── */

/** Nature de la pièce : structurée, jamais du texte libre. */
export type KycIdentityDocumentType = 'NATIONAL_ID_CARD' | 'PASSPORT';

/** Face d'un document. */
export type IdentitySide = 'RECTO' | 'VERSO' | 'SINGLE';

export const IDENTITY_DOCUMENT_LABELS: Record<KycIdentityDocumentType, string> = {
  NATIONAL_ID_CARD: 'Carte nationale d’identité',
  PASSPORT: 'Passeport',
};

export const IDENTITY_SIDE_LABELS: Record<IdentitySide, string> = {
  RECTO: 'Recto',
  VERSO: 'Verso',
  SINGLE: 'Page unique',
};

/** Le type de pièce est-il connu ? */
export function isIdentityDocumentType(value: string): boolean {
  return value in IDENTITY_DOCUMENT_LABELS;
}

export function identityDocumentLabel(value: string | null): string | null {
  return value ? IDENTITY_DOCUMENT_LABELS[value as KycIdentityDocumentType] ?? null : null;
}

export function identityDocumentSideLabel(side: string): string {
  return IDENTITY_SIDE_LABELS[side as IdentitySide] ?? side;
}

/**
 * Faces exigées pour une nature de pièce.
 *
 * Miroir EXACT de la table backend `IDENTITY_DOCUMENT_DEFINITIONS` : une CNI
 * a un verso, un passeport non. Le parcours ne demande donc JAMAIS un verso
 * inexistant, et ne peut pas exiger la page d'un passeport en SINGLE puis en
 * RECTO selon le chemin emprunté.
 */
export function requiredIdentitySides(docType: string | null): IdentitySide[] {
  if (docType === 'NATIONAL_ID_CARD') return ['RECTO', 'VERSO'];
  if (docType === 'PASSPORT') return ['SINGLE'];
  /* Type pas encore choisi : on n'affiche aucune face, le parcours demande
   * d'abord la nature de la pièce. */
  return [];
}

/* ── Activité professionnelle (§5) ─────────────────────────────────────── */

export type TechnicianActivityType = 'FREELANCE' | 'SALARIED' | 'COMPANY' | 'OTHER';

export const ACTIVITY_TYPE_LABELS: Record<TechnicianActivityType, string> = {
  FREELANCE: 'Freelance / indépendant',
  SALARIED: 'Salarié',
  COMPANY: 'Entreprise / atelier',
  OTHER: 'Autre statut',
};

export function activityTypeLabel(value: TechnicianActivityType | null): string | null {
  return value ? ACTIVITY_TYPE_LABELS[value] : null;
}

/* ── Statuts KYC (§20) ──────────────────────────────────────────────────── */

export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export const KYC_LABELS: Record<KycStatus, string> = {
  NOT_SUBMITTED: 'Identité non vérifiée',
  PENDING: 'Vérification en cours',
  VERIFIED: 'Identité vérifiée par Relio',
  REJECTED: 'Vérification à compléter',
};

export const KYC_VARIANTS: Record<
  KycStatus,
  'info' | 'warning' | 'success' | 'danger' | 'neutral'
> = {
  NOT_SUBMITTED: 'neutral',
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
};

export function kycStatusLabel(status: string): string {
  return KYC_LABELS[status as KycStatus] ?? KYC_LABELS.NOT_SUBMITTED;
}

export function kycVariantFor(status: string): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  return KYC_VARIANTS[status as KycStatus] ?? KYC_VARIANTS.NOT_SUBMITTED;
}

export function kycIsVerified(status: string): boolean {
  return status === 'VERIFIED';
}

/** Dossier verrouillé : le backoffice a rendu son verdict, rien ne bouge. */
export function kycIsLocked(status: string): boolean {
  return status === 'VERIFIED';
}

/** Le dossier peut-il encore être transmis ou modifié ? */
export function kycIsOpen(status: string): boolean {
  return status !== 'VERIFIED';
}

/* ── Bandeaux de garde (chantier #5A) ────────────────────────────────────────

 * Le technicien dont l'identité n'est pas vérifiée CONTINUE de voir les
 * missions (elles sont sa motivation) mais ne peut pas les accepter. Ces
 * règles pures produisent le contenu du bandeau, pour que les trois pages
 * concernées (liste, détail, dashboard) affichent le MÊME message sans
 * dupliquer aucun texte.
 *
 * `null` = aucun bandeau : soit le statut est inconnu (on ne devine pas un
 * statut à partir d'un chargement échoué, on attend), soit il est vérifié. */

/** Bandeau commun aux pages « missions » (liste et détail de mission). */
export interface KycAcceptanceBanner {
  variant: 'error';
  title: string;
  description: string;
  /** Libellé du bouton de sortie. Toujours présent : le bandeau doit
   *  toujours offrir une issue. */
  ctaLabel: string;
}

/** Route du dossier KYC (page dédiée). */
export const KYC_PAGE_HREF = '/technicien/kyc';

/**
 * Bandeau bloquant l'ACCEPTATION d'une mission.
 *
 * Un seul et même message quel que soit le statut : la page missions doit
 * répondre à une seule question (« pourquoi ne puis-je pas accepter ? »), et
 * le motif de rejet éventuel est la seule information variable utile.
 */
export function kycAcceptanceBanner(
  status: string | null | undefined,
  rejectionReason?: string | null,
): KycAcceptanceBanner | null {
  /* Statut inconnu : on n'affiche RIEN. Un chargement de profil échoué ne
   * doit jamais produire un bandeau affirmant que le compte est non vérifié
   * (le backend reste seul juge, et il refuse l'acceptation de toute façon). */
  if (!status || kycIsVerified(status)) return null;

  const motif = rejectionReason?.trim();
  return {
    variant: 'error',
    title: 'Vérifiez votre identité pour accepter des missions',
    description: motif
      ? `Vous pouvez consulter cette mission en détail, mais pas l’accepter tant que votre identité n’est pas vérifiée. Motif du refus : ${motif}`
      : 'Vous pouvez consulter cette mission en détail, mais pas l’accepter tant que votre identité n’est pas vérifiée.',
    ctaLabel: 'Compléter ma vérification',
  };
}

/** Bandeau du dashboard : lui, il varie selon l'étape du dossier. */
export interface KycDashboardBanner {
  variant: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  /** `null` = rien à faire pour l'instant (ex. dossier en cours d'examen). */
  ctaLabel: string | null;
}

/**
 * Bandeau du dashboard technicien.
 *
 * Le ton suit l'étape : rien n'est reproché au technicien, et un dossier en
 * cours d'examen n'appelle AUCUNE action (proposer « corriger » un dossier
 * qu'on est en train d'examiner serait un contresens).
 */
export function kycDashboardBanner(
  status: string | null | undefined,
  rejectionReason?: string | null,
): KycDashboardBanner | null {
  if (!status || kycIsVerified(status)) return null;

  if (status === 'REJECTED') {
    const motif = rejectionReason?.trim();
    return {
      variant: 'error',
      title: 'Votre dossier a été refusé',
      description: motif
        ? `Motif : ${motif}. Corrigez ces points et renvoyez votre dossier pour être validé.`
        : 'Corrigez votre dossier et renvoyez-le pour être validé.',
      ctaLabel: 'Corriger mon dossier',
    };
  }

  if (status === 'PENDING') {
    return {
      variant: 'info',
      title: 'Vérification en cours',
      description:
        'Votre dossier est en cours d’examen. Vous serez notifié dès qu’il sera traité.',
      ctaLabel: null,
    };
  }

  /* NOT_SUBMITTED (ou statut inconnu du backend) : il n'y a rien à corriger,
   * il n'y a qu'à commencer. */
  return {
    variant: 'warning',
    title: 'Complétez votre vérification d’identité',
    description:
      'Complétez votre vérification d’identité pour recevoir et accepter des missions.',
    ctaLabel: 'Commencer',
  };
}