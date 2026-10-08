import { Badge } from '@/components/ui/badge';
import {
  rewardBadgeView,
  type RewardTierName,
} from '@/lib/rewards-view';

/**
 * Chantier 4-FONDATIONS-C — Badge de niveau du programme de fidélité LTV.
 *
 * API INCHANGÉE (`tier`, `size`, `className`) : l'intégration existante
 * (`/client/profil`) n'a pas à être touchée. Seule la table de présentation
 * change : les paliers sont désormais FIDELE / OR / PLATINE (l'ancien
 * BRONZE n'existe plus) et les seuils portent sur la MARGE CUMULÉE.
 *
 * COMPOSANT D'AFFICHAGE PUR : toute la décision (emoji, libellé, classes
 * sémantiques, et le cas `NONE` → rien) est dans `lib/rewards-view.ts`, qui
 * est testable sans React. Ce fichier ne fait que rendre.
 *
 * RÈGLES UI/UX (`docs/UI-UX-ARCHITECTURE.md` §8) : couleurs SÉMANTIQUES
 * uniquement, aucun hex arbitraire, aucune nouvelle librairie — voir le
 * commentaire de `REWARD_BADGE_VIEW` pour la correspondance palier → tokens.
 */

export interface RewardBadgeProps {
  tier: RewardTierName;
  size?: 'sm' | 'md';
  className?: string;
}

export function RewardBadge({ tier, size = 'md', className }: RewardBadgeProps) {
  const view = rewardBadgeView(tier);
  /* `NONE` : pas de badge du tout. */
  if (!view) return null;

  return (
    <Badge
      variant="neutral"
      className={[
        'gap-1 whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0 text-2xs' : '',
        view.className,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden="true">{view.emoji}</span>
      {view.label}
    </Badge>
  );
}
