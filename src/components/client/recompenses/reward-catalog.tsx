'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/lib/toast-context';

export interface RewardItem {
  id: string;
  tier: string;
  title: string;
  description: string;
  imageSrc: string;
  requiredServices: number;
  badge?: string;
  isMystery?: boolean;
}

/* Catalogue des lots fidélité (le compteur de dépannages confirmés, lui,
 * est réel). Visuels servis depuis `/public/recompense/`. */
export const REWARDS_CATALOG: RewardItem[] = [
  {
    id: 'free-repair',
    tier: 'PALIER 5 DÉPANNAGES',
    title: 'Dépannage 100% Gratuit',
    description: 'Une main d’œuvre entièrement offerte sur votre prochaine intervention.',
    imageSrc: '/recompense/free_repair.png',
    requiredServices: 5,
  },
  {
    id: 'tshirt-cap',
    tier: 'PALIER 5 DÉPANNAGES',
    title: 'T-shirt & Casquette Relio',
    description: 'Pack collector officiel Relio livré gratuitement chez vous.',
    imageSrc: '/recompense/tshirt_cap.png',
    requiredServices: 5,
  },
  {
    id: 'iron-pro',
    tier: 'PALIER 12 DÉPANNAGES',
    title: 'Fer à Repasser Qualité Pro',
    description: 'Un fer à repasser performant pour votre maison.',
    imageSrc: '/recompense/iron.png',
    requiredServices: 12,
  },
  {
    id: 'smart-tv',
    tier: 'PALIER 25 DÉPANNAGES',
    title: 'Écran TV LED Smart',
    description: 'Téléviseur Haute Définition offert aux clients les plus fidèles.',
    imageSrc: '/recompense/tv.png',
    requiredServices: 25,
  },
  {
    id: 'smartphone',
    tier: 'PALIER 50 DÉPANNAGES',
    title: 'Smartphone Moderne',
    description: 'Un smartphone performant offert pour accompagner votre quotidien.',
    imageSrc: '/recompense/smartphone.png',
    requiredServices: 50,
  },
  {
    id: 'mystery-grand-prize',
    tier: 'PALIER 100 DÉPANNAGES',
    title: 'Un cadeau surprise',
    description: 'Le lot ultime réservé exclusivement aux membres d’exception.',
    imageSrc: '/recompense/mystery_box.png',
    requiredServices: 100,
    badge: 'Grand Prix',
    isMystery: true,
  },
];

/* Carte récompense : affiche marketing plein format (full-bleed cover) —
 * le poster remplit tout son conteneur sans marge interne pour rester
 * lisible. Clic sur l'affiche → lightbox plein écran pour lecture complète. */
function RewardCard({ reward, completedCount }: { reward: RewardItem; completedCount: number }) {
  const { toast } = useToast();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const unlocked = completedCount >= reward.requiredServices;
  const progress = Math.min(completedCount / reward.requiredServices, 1);

  const claimReward = () => {
    toast({
      title: 'Cadeau réclamé !',
      description: 'Notre équipe vous contactera pour organiser la remise.',
      variant: 'success',
    });
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-xl dark:border-white/10 dark:bg-[#151922]">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={`Voir l’affiche ${reward.title} en grand`}
        className="relative block w-full cursor-zoom-in overflow-hidden rounded-t-2xl bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aspect-[4/3] sm:aspect-[3/4]"
      >
        <Image
          src={reward.imageSrc}
          alt={reward.title}
          fill
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        {reward.isMystery ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-extrabold text-[#F97316] drop-shadow-[0_0_18px_rgba(249,115,22,0.55)]"
          >
            ?
          </span>
        ) : null}
        <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
            <Icon name="zoom-in" size="sm" />
            Voir l’affiche en grand
          </span>
        </span>
      </button>
      {reward.badge ? (
        <span className="absolute right-3 top-3">
          <Badge variant="outline">{reward.badge}</Badge>
        </span>
      ) : null}
      <div className="flex flex-1 flex-col space-y-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {reward.tier}
        </p>
        <p className="text-base font-semibold">{reward.title}</p>
        <p className="text-sm text-muted-foreground">{reward.description}</p>
        <div>
          {unlocked ? (
            <Badge variant="success">Débloqué</Badge>
          ) : (
            <Badge variant={reward.requiredServices > 5 ? 'neutral' : 'warning'}>
              Verrouillé ({completedCount}/{reward.requiredServices})
            </Badge>
          )}
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progression vers ${reward.title}`}
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
      <div className="px-4 pb-4">
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

      <Modal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={reward.title}
        description={reward.tier}
        className="sm:max-w-2xl"
      >
        <div className="relative w-full overflow-hidden rounded-xl bg-slate-900 aspect-[4/3] sm:aspect-[16/10]">
          <Image
            src={reward.imageSrc}
            alt={reward.title}
            fill
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 672px"
            className="object-contain"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{reward.description}</p>
      </Modal>
    </div>
  );
}

export function RewardCatalog({ completedCount }: { completedCount: number }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {REWARDS_CATALOG.map((reward) => (
        <RewardCard key={reward.id} reward={reward} completedCount={completedCount} />
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
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
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
