'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GradientHeroCard } from '@/components/ui/gradient-hero-card';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { RewardBadge } from '@/components/client/reward-badge';
import { RecompensesSkeleton } from '@/components/client/recompenses/recompenses-skeleton';
import { HowItWorks } from '@/components/client/recompenses/reward-catalog';
import {
  claimTier,
  getRewardsProgress,
  type RewardProgress,
  type RewardTier,
  type RewardTierKey,
} from '@/lib/api/rewards-service';
import {
  missionsRemaining,
  progressPercent,
  tierStatus,
  TIER_STATUS_LABEL,
} from '@/lib/rewards-view';
import { formatFCFA } from '@/lib/format-fcfa';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { useToast } from '@/lib/toast-context';

/* Chantier #4A — Programme de récompenses.
 *
 * Données 100 % backend (`GET /client/rewards`). Le compteur n'est plus
 * recalculé depuis l'historique local : c'est le backend qui autorise le
 * comptage (mission CONFIRMED, payée ≥ 1 500 XAF, sans signalement
 * anti-fraude).
 *
 * RÈGLE FCFA : tous les montants affichés passent par `formatFCFA`. Le backend
 * n'envoie que des ENTIERS XAF.
 *
 * L'authentification et le rôle CLIENT sont déjà garantis par le
 * `RoleGuard` du layout `/client` (cf. ARCHITECTURE.md) : cette page ne
 * refait donc pas le `getMe()` + redirection que portait la version
 * précédente. */

export default function ClientRecompensesPage() {
  const { toast } = useToast();
  const [progress, setProgress] = useState<RewardProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* Palier en cours de demande d'usage, pour n'afficher qu'un seul bouton
   * « en cours » à la fois. */
  const [claimingTier, setClaimingTier] = useState<RewardTierKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProgress(await getRewardsProgress());
      setError(null);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de charger vos récompenses.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Demande d'usage d'une récompense.
   *
   * On NE recharge pas toute la progression après le claim : la réponse du
   * backend porte déjà `claimedTiers`, donc on fusionne localement. C'est à la
   * fois plus rapide et ça évite qu'un échec réseau fasse clignoter la page
   * alors que la demande a bien été enregistrée. */
  async function handleClaim(tier: RewardTier) {
    setClaimingTier(tier.tier);
    try {
      const result = await claimTier(tier.tier);
      setProgress((current) =>
        current ? { ...current, claimedTiers: result.claimedTiers } : current,
      );
      toast({
        title: `Palier ${tier.label} atteint`,
        description: 'Votre demande est enregistrée.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Demande non enregistrée',
        description: toUserErrorMessage(err, 'La demande n’a pas pu être enregistrée.'),
        variant: 'error',
      });
      /* Le serveur reste la source de vérité : on relit pour refléter un
       * éventuel doublon (400 « déjà enregistrée »). */
      void load();
    } finally {
      setClaimingTier(null);
    }
  }

  if (loading) return <RecompensesSkeleton />;

  if (error || !progress) {
    return (
      <div className="space-y-4">
        <PageHeader title="Programme de récompenses" />
        <Alert variant="error">{error ?? 'Données indisponibles.'}</Alert>
        <Button onClick={() => void load()}>Réessayer</Button>
      </div>
    );
  }

  const { missionCount, currentTier, nextTier, tiers } = progress;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Programme de récompenses"
        description="Plus tu dépanne, plus tu gagnes."
      />

      {/* ── Niveau actuel ── */}
      <GradientHeroCard tone="brand">
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Niveau actuel
            </p>
            <div className="mt-2">
              {/* `NONE` ne rend rien : l'absence de badge est l'information. */}
              <RewardBadge tier={currentTier} />
            </div>
            <p className="mt-2.5">
              <span className="figure tabular-nums text-4xl font-extrabold text-relio-orange-bright">
                {missionCount}
              </span>{' '}
              <span className="text-sm font-medium text-slate-300">
                mission{missionCount !== 1 ? 's' : ''} validée{missionCount !== 1 ? 's' : ''}
              </span>
            </p>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-float">
            <Icon name="sparkles" size="lg" />
          </span>
        </div>
      </GradientHeroCard>

      {/* ── Progression vers le prochain palier ── */}
      {nextTier ? (
        <section
          aria-label="Progression vers le prochain palier"
          className="rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Prochain palier
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <RewardBadge tier={nextTier.tier} size="sm" />
                <span className="figure tabular-nums text-muted-foreground">
                  {missionCount} / {nextTier.missions}
                </span>
              </p>
            </div>
          </div>

          <div
            className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progressPercent(missionCount, nextTier.missions)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progression vers le palier ${nextTier.label}`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent(missionCount, nextTier.missions)}%` }}
            />
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Encore <strong className="figure tabular-nums">{nextTier.remaining}</strong> mission
            {nextTier.remaining !== 1 ? 's' : ''} pour débloquer {nextTier.reward.toLowerCase()}{' '}
            <span className="whitespace-nowrap">({formatFCFA(nextTier.rewardValueXAF)})</span>.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Icon name="sparkles" size="sm" className="text-primary" />
            <p className="text-sm font-semibold">
              Vous avez atteint le dernier palier du programme. Bravo !
            </p>
          </div>
        </section>
      )}

      {/* ── Les 4 paliers ── */}
      <section className="space-y-1">
        <SectionHeader title="Vos paliers" icon="sparkles" />
        <ul className="space-y-2">
          {tiers.map((tier) => {
            const status = tierStatus(tier, missionCount, progress.reachedTiers, progress.claimedTiers);
            const tierPercent = progressPercent(missionCount, tier.missions);
            const remaining = missionsRemaining(tier, missionCount);
            const isReached = status === 'CLAIMED' || status === 'REACHED';

            return (
              <li key={tier.tier}>
                <article
                  className={[
                    'rounded-2xl border bg-card p-4 transition-colors',
                    isReached ? 'border-primary/40' : 'border-border',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg">
                      {isReached ? (
                        <Icon name="badge-check" size="md" />
                      ) : (
                        <Icon name="shield" size="sm" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <RewardBadge tier={tier.tier} size="sm" />
                        <span className="figure tabular-nums text-xs text-muted-foreground">
                          {tier.missions} missions
                        </span>
                        {status !== 'REACHED' && status !== 'IN_PROGRESS' ? (
                          <Badge variant={status === 'CLAIMED' ? 'success' : 'neutral'} className="text-2xs">
                            {TIER_STATUS_LABEL[status]}
                          </Badge>
                        ) : null}
                      </div>

                      <p className="mt-1.5 text-sm font-medium">{tier.reward}</p>
                      <p className="figure tabular-nums text-xs text-muted-foreground">
                        Valeur indicative : {formatFCFA(tier.rewardValueXAF)}
                      </p>

                      {/* Progression individuelle du palier. */}
                      {status === 'IN_PROGRESS' ? (
                        <div
                          className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-valuenow={tierPercent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progression vers le palier ${tier.label}`}
                        >
                          <div
                            className="h-full rounded-full bg-muted-foreground transition-all"
                            style={{ width: `${tierPercent}%` }}
                          />
                        </div>
                      ) : null}

                      {status === 'REACHED' ? (
                        <Button
                          className="mt-3 w-full sm:w-auto"
                          disabled={claimingTier !== null}
                          isLoading={claimingTier === tier.tier}
                          onClick={() => void handleClaim(tier)}
                        >
                          Utiliser ma récompense
                        </Button>
                      ) : null}

                      {status === 'CLAIMED' ? (
                        <p className="mt-2.5 text-xs text-muted-foreground">
                          Demande enregistrée : un conseiller Relio vous contacte pour
                          l&apos;appliquer.
                        </p>
                      ) : null}

                      {status === 'LOCKED' ? (
                        <p className="mt-2.5 text-xs text-muted-foreground">
                          Encore {remaining} mission{remaining !== 1 ? 's' : ''} pour
                          débloquer ce palier.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      <HowItWorks />

      {/* Accès au parrainage (page voisine, thématiquement proche). */}
      <Link
        href="/client/parrainage"
        className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
          <Icon name="send" size="md" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Parrainer un ami</span>
          <span className="block truncate text-xs text-muted-foreground">
            Invitez vos proches et partagez votre code Relio.
          </span>
        </span>
        <Icon name="arrow-right" size="sm" className="shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}
