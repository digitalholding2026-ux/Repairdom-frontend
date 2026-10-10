import type { ReactNode } from 'react';
import type { IconName } from '@/components/ui/icon';

/* Forme d'un élément de flux d'activité.
 *
 * ORIGINE : ces types vivaient dans le composant de flux d’activité du
 * au-dessus du composant qui les consommait. Ce composant n'a jamais été monté,
 * mais les TYPES, eux, sont utilisés par l'espace technicien — d'où un fichier
 * technicien — d’où un fichier dont la moitié des exports était morte.
 *
 * DÉPLACEMENT, PAS COPIE : les types sont ici, leur fichier d'origine a
 * disparu. Le ré-export aurait été plus rapide, mais il laisse deux chemins
 * vers la même définition — et deux chemins pour un type, c'est deux réponses
 * à « lequel est le bon ? ».
 *
 * `src/lib/` parce que le flux d'activité n'appartient pas au client : les
 * deux espaces Connectés décrivent la même information, avec la même forme.
 * Un jour, le composant de rendu pourra revenir ici — sans réinventer le
 * contrat.
 */

export type ActivityTone = 'primary' | 'success' | 'info' | 'warning';

export interface ActivityItem {
  id: string;
  icon: IconName;
  tone: ActivityTone;
  title: string;
  subtitle?: string;
  /** Badge de statut optionnel (ex. statut de demande via request-status). */
  badge?: ReactNode;
  amount?: number;
  currency?: string;
  createdAt: string;
  href?: string;
}
