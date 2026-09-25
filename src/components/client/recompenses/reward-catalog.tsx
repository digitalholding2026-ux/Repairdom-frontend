'use client';

import Link from 'next/link';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { useToast } from '@/lib/toast-context';

interface RewardTier {
  id: string;
  title: string;
  requiredCount: number;
  icon: IconName;
  description: string;
  /** Variante du badge quand le lot est encore verrouillé. */
  lockedVariant: BadgeVariant;
  grandPrize?: boolean;
}

/* Catalogue des lots fidélité (données de présentation ; le compteur de
 * dépannages confirmés, lui, est réel). */
const REWARD_TIERS: RewardTier[] = [
  {
    id: 'free-repair',
    title: 'Dépannage 100% Gratuit',
    requiredCount: 5,
    icon: 'wrench',
    description: 'Une main d\u2019œuvre entièrement offerte sur votre prochaine intervention.',
    lockedVariant: 'warning',
  },
  {
    id: 'relio-pack',
    title: 'T-shirt & Casquette Relio',
    requiredCount: 5,
    icon: 'sparkles',
    description: 'Pack collector officiel Relio livré gratuitement chez vous.',
    lockedVariant: 'warning',
  },
  {
    id: 'iron',
    title: 'Fer à Repasser Qualité Pro',
    requiredCount: 12,
    icon: 'zap',
    description: 'Un fer à repasser performant pour votre maison.',
    lockedVariant: 'neutral',
  },
  {
    id: 'tv',
    title: 'Écran TV LED Smart',
    requiredCount: 25,
    icon: 'cpu',
    description: 'Téléviseur Haute Définition offert aux clients les plus fidèles.',
    lockedVariant: 'neutral',
  },
  {
    id: 'fridge',
    title: 'Réfrigérateur Familial',
    requiredCount: 50,
    icon: 'thermometer',
    description: 'Le gros lot électroménager livré et installé chez vous.',
    lockedVariant: 'neutral',
    grandPrize: true,
  },
];

function RewardCard({ tier, completedCount }: { tier: RewardTier; completedCount: number }) {
  const { toast } = useToast();
  const unlocked = completedCount >= tier.requiredCount;
  const progress = Math.min(completedCount / tier.requiredCount, 1);

  const claimReward = () => {
    toast({
      title: 'Cadeau réclamé !',
      description: 'Notre équipe vous contactera pour organiser la remise.',
      variant: 'success',
    });
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md dark:border-slate-800">
      {tier.grandPrize ? (
        <span className="absolute right-3 top-3">
          <Badge variant="outline">Grand Prix</Badge>
        </span>
      ) : null}
      <div>
        <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200">
          <Icon name={tier.icon} size="md" />
        </span>
        <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Palier {tier.requiredCount} dépannages
        </p>
        <p className="mt-1 text-base font-semibold">{tier.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
        <div className="mt-3">
          {unlocked ? (
            <Badge variant="success">Débloqué</Badge>
          ) : (
            <Badge variant={tier.lockedVariant}>
              Verrouillé ({completedCount}/{tier.requiredCount})
            </Badge>
          )}
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progression vers ${tier.title}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
      <div className="mt-4">
        {unlocked ? (
          <Button size="sm" className="w-full animate-bounce" onClick={claimReward}>
            Réclamer le cadeau
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" disabled>
            En savoir plus
          </Button>
        )}
      </div>
    </div>
  );
}

export function RewardCatalog({ completedCount }: { completedCount: number }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {REWARD_TIERS.map((tier) => (
        <RewardCard key={tier.id} tier={tier} completedCount={completedCount} />
      ))}
    </div>
  );
}

const HOW_IT_WORKS_STEPS = [
  {
    step: '1. Commandez',
    text: 'Lancez vos demandes de dépannage sur Relio.',
  },
  {
    step: '2. Validez',
    text: 'Chaque mission terminée valide 1 point de fidélité.',
  },
  {
    step: '3. Recevez',
    text: 'Réclamez vos cadeaux et recevez-les gratuitement !',
  },
];

export function HowItWorks() {
  return (
    <div className="mt-10 rounded-2xl border border-slate-200/60 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-base font-semibold tracking-tight sm:text-lg">Comment ça marche ?</p>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {HOW_IT_WORKS_STEPS.map((item) => (
          <div key={item.step} className="rounded-xl bg-card p-4 shadow-sm">
            <p className="text-sm font-semibold text-primary">{item.step}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
      <Link href="/client/demande" className="mt-4 block">
        <Button className="w-full gap-2 sm:w-auto">
          <Icon name="plus" size="sm" />
          Lancer un dépannage
        </Button>
      </Link>
    </div>
  );
}
