/* Détection de la boîte mail à partir de l'adresse e-mail.
 *
 * POURQUOI UN MODULE À PART
 * La fonction est pure : aucune dépendance React, aucun accès réseau. La
 * sortir du panneau de vérification permet de la tester par EXÉCUTION — les
 * tests du dépôt sont majoritairement statiques (`readFileSync` + regex sur le
 * texte), ce qui ne prouve rien d'une correspondance de domaines. Ici, on
 * appelle réellement la fonction avec des adresses et on vérifie ce qu'elle
 * renvoie. C'est le seul endroit du chantier où un test s'exécute.
 *
 * `MAILBOXES` est volontairement une liste figée : les messageries
 * principales et leurs domaines connus. Un domaine non reconnu ne doit
 * PAS produire de lien : on renvoie `null`, et l'interface affiche alors un
 * message générique plutôt qu'un bouton qui ne mènerait nulle part.
 */

export interface Mailbox {
  /** Libellé du fournisseur, tel qu'il est affiché dans le bouton. */
  label: string;
  /** Page de boîte de réception, ouverte dans un nouvel onglet. */
  url: string;
}

/* `googlemail.com` est l'adresse d'exportation de Gmail : les comptes
 * Google les plus anciens l'utilisent encore. De même `hotmail`/`live` pour
 * le même fournisseur. Les confondre laisserait le visiteur devant une page
 * d'accueil au lieu de sa boîte. */
const MAILBOXES: readonly ({ domains: readonly string[] } & Mailbox)[] = [
  {
    domains: ['gmail.com', 'googlemail.com'],
    label: 'Gmail',
    url: 'https://mail.google.com',
  },
  {
    domains: ['outlook.com', 'hotmail.com', 'live.com', 'hotmail.fr', 'outlook.fr'],
    label: 'Outlook',
    url: 'https://outlook.live.com/mail',
  },
  {
    domains: ['yahoo.com', 'yahoo.fr'],
    label: 'Yahoo Mail',
    url: 'https://mail.yahoo.com',
  },
  {
    domains: ['protonmail.com', 'proton.me'],
    label: 'Proton Mail',
    url: 'https://mail.proton.me',
  },
  {
    domains: ['icloud.com', 'me.com', 'mac.com'],
    label: 'iCloud Mail',
    url: 'https://www.icloud.com/mail',
  },
];

/**
 * Renvoie la boîte mail correspondant à une adresse, ou `null` si le
 * fournisseur n'est pas connu.
 *
 * La casse est normalisée : `Gmail.COM` et `gmail.com` désignent le même
 * compte. Une adresse sans `@`, ou dont le domaine est vide, renvoie `null`
 * plutôt que de lever — l'appelant n'a pas à protéger l'appel.
 */
export function getMailboxUrl(email: string | null | undefined): Mailbox | null {
  const domain = email?.split('@')[1]?.trim().toLowerCase();
  if (!domain) return null;
  const found = MAILBOXES.find((mailbox) => mailbox.domains.includes(domain));
  if (!found) return null;
  return { label: found.label, url: found.url };
}

/** Domaines reconnus — exporté pour les tests et la documentation. */
export const SUPPORTED_MAILBOX_DOMAINS: readonly string[] = MAILBOXES.flatMap(
  (mailbox) => mailbox.domains,
);