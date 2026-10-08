'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { RewardBadge } from '@/components/client/reward-badge';
import { GradientHeroCard } from '@/components/ui/gradient-hero-card';
import {
  claimCredits,
  claimNatureReward,
  getRewardsProgress,
  type RewardProgress,
} from '@/lib/api/rewards-service';
import {
  BADGE_STATUS_LABEL,
  NATURE_STATUS_LABEL,
  badgeStatus,
  buildRewardTimeline,
  canClaimCredits,
  creditProgressPercent,
  isNatureClaimable,
  marginRemaining,
  natureStatus,
  progressPercent,
  rewardBadgeView,
} from '@/lib/rewards-view';
import { formatFCFA } from '@/lib/format-fcfa';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { useToast } from '@/lib/toast-context';
import { useRealtime } from '@/lib/realtime/sse-context';
import { useUserStream } from '@/lib/realtime/use-user-stream';

/**
 * Chantier 4-FONDATIONS-C — Programme de fidélité LTV.
 *
 * L'unité affichée n'est plus « X missions » mais la MARGE CUMULÉE générée par
 * le client : c'est ce qui rend le programme lisible ET soutenable (les
 * crédits sont plafonnés à 5 % de cette marge).
 *
 * RÈGLE FCFA : aucun montant n'est formaté en dur. Tout passe par
 * `formatFCFA`, y compris dans les textes d'aide.
 *
 * Le composant ne DÉCIDE rien : les statuts, pourcentages et la timeline
 * viennent de `lib/rewards-view.ts` (testable sans React). Les montants
 * affichés viennent TOUJOURS du backend — cette page ne recalcule aucun
 * barème.
 */
export default function ClientRecompensesPage() {
  const [progress, setProgress] = useState<RewardProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creditsBusy, setCreditsBusy] = useState(false);
  const [natureBusy, setNatureBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    try {
      setProgress(await getRewardsProgress());
      setError(null);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur de chargement.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  /* Une mission confirmée ailleurs (autre onglet, autre appareil) fait évoluer
   * la marge : on rafraîchit sans rechargement. */
  useUserStream((message) => {
    if (message.type === 'client.rewards_updated') void load();
  });
  useRealtime();

  /* Récompense nature réclamée : le backend répond l'état à jour, on
   * recharge plutôt que de deviner localement. */
  const handleClaimNature = async (tier: string) => {
    setNatureBusy(tier);
    try {
      await claimNatureReward(tier);
      await load();
      toast({ title: 'Demande enregistrée.', description: 'Notre équipe vous contactera.', variant: 'success' });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Réclamation impossible pour le moment.'));
    } finally {
      setNatureBusy(null);
    }
  };

  /* Crédits : le montant n'est JAMAIS envoyé par le client, le backend
   * verse ce qu'il a calculé. */
  const handleClaimCredits = async () => {
    setCreditsBusy(true);
    try {
      const result = await claimCredits();
      await load();
      toast({
        title: 'Crédits ajoutés à votre solde.',
        description: `${formatFCFA(result.claimedXAF)} · nouveau solde ${formatFCFA(result.newBalanceXAF)}`,
        variant: 'success',
      });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible d’ajouter les crédits à votre solde.'));
    } finally {
      setCreditsBusy(false);
    }
  };

  const timeline = useMemo(
    () => (progress ? buildRewardTimeline(progress) : []),
    [progress],
  );

  if (loading) {
    return (
      <div className="flex min-h-40 items-center justify-center py-10" role="status">
        <span className="sr-only">Chargement…</span>
        <Spinner />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="space-y-4">
        <PageHeader title="Programme de fidélité" backHref="/client" />
        <Alert variant="error">{error ?? 'Progression indisponible.'}</Alert>
      </div>
    );
  }

  const badge = rewardBadgeView(progress.currentTier);
  const creditPercent = creditProgressPercent(progress.cumulativeMarginXAF, progress.trancheXAF);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Programme de fidélité"
        description="Vos crédits et vos récompenses évoluent avec la valeur que vous générez chez Relio."
        backHref="/client"
        actions={
          <Link href="/client/parrainage" className="text-sm font-medium text-primary hover:underline">
            Inviter un ami
          </Link>
        }
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      {/* ── Hero : marge cumulée + palier courant ── */}
      <GradientHeroCard tone="brand">
        <p className="text-sm text-white/80">Marge cumulée générée</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-white">
          {formatFCFA(progress.cumulativeMarginXAF)}
        </p>
        <div className="relative mt-4 flex flex-wrap items-center gap-2.5">
          {badge ? <RewardBadge tier={progress.currentTier} size="sm" /> : null}
          {progress.currentTier === 'NONE' ? (
            <span className="text-xs text-white/80">
              Premier palier à {formatFCFA(progress.tiers[0]?.margeXAF ?? 0)} de marge
            </span>
          ) : (
            <span className="text-xs text-white/80">Votre palier actuel</span>
          )}
        </div>
      </GradientHeroCard>

      {/* ── Crédits ── */}
      <section className="space-y-3">
        <SectionHeader title="Crédits" />
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Disponible sur votre solde</p>
                <p className="text-2xl font-bold tabular-nums">
                  {formatFCFA(progress.creditsAvailable)}
                </p>
              </div>
              <Button
                onClick={handleClaimCredits}
                isLoading={creditsBusy}
                disabled={!canClaimCredits(progress.creditsAvailable) || creditsBusy}
              >
                <Icon name="plus" size="sm" />
                Ajouter à mon solde
              </Button>
            </div>

            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={creditPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression vers le prochain crédit"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${creditPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Encore{' '}
              <strong className="figure tabular-nums">
                {formatFCFA(progress.marginToNextCreditXAF)}
              </strong>{' '}
              de marge pour {formatFCFA(progress.creditPerTrancheXAF)} de crédit. Chaque tranche de{' '}
              {formatFCFA(progress.trancheXAF)} vaut {formatFCFA(progress.creditPerTrancheXAF)}.
            </p>
            <p className="text-xs text-muted-foreground">
              Crédits cumulés {formatFCFA(progress.creditsEarned)} · déjà ajoutés{' '}
              {formatFCFA(progress.creditsClaimed)}.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* ── Badges ── */}
      <section className="space-y-3">
        <SectionHeader title="Badges" />
        <ul className="space-y-2">
          {progress.tiers.map((tier) => {
            const status = badgeStatus(tier, progress.cumulativeMarginXAF, progress.reachedTiers);
            const percent = progressPercent(progress.cumulativeMarginXAF, tier.margeXAF);
            return (
              <li key={tier.tier}>
                <Card>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span aria-hidden="true">{tier.emoji}</span>
                        {tier.label}
                      </span>
                      <Badge variant={status === 'REACHED' ? 'success' : 'neutral'}>
                        {BADGE_STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFCFA(tier.margeXAF)} de marge
                      {status === 'REACHED'
                        ? ' · atteint'
                        : ` · encore ${formatFCFA(marginRemaining(tier, progress.cumulativeMarginXAF))}`}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Récompenses nature ── */}
      <section className="space-y-3">
        <SectionHeader title="Récompenses nature" />
        <ul className="space-y-2">
          {progress.natureThresholds.map((tier) => {
            const status = natureStatus(
              tier,
              progress.cumulativeMarginXAF,
              progress.natureReached,
              progress.natureClaimed,
            );
            const claimable = isNatureClaimable(
              tier,
              progress.cumulativeMarginXAF,
              progress.natureReached,
              progress.natureClaimed,
            );
            return (
              <li key={tier.tier}>
                <Card>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-medium">{tier.label}</span>
                      <Badge variant={status === 'CLAIMED' ? 'info' : status === 'REACHED' ? 'success' : 'neutral'}>
                        {NATURE_STATUS_LABEL[status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatFCFA(tier.margeXAF)} de marge cumulée
                      {status === 'LOCKED' || status === 'IN_PROGRESS'
                        ? ` · encore ${formatFCFA(marginRemaining(tier, progress.cumulativeMarginXAF))}`
                        : ''}
                    </p>
                    {claimable ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handleClaimNature(tier.tier)}
                        isLoading={natureBusy === tier.tier}
                        disabled={natureBusy !== null}
                      >
                        <Icon name="sparkles" size="sm" />
                        Réclamer ma récompense
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Timeline ── */}
      <section className="space-y-3">
        <SectionHeader title="Vos paliers" />
        {timeline.length === 0 ? (
          <EmptyState
            icon={<Icon name="badge-check" size="lg" />}
            title="Aucun palier pour le moment"
            description="Vos paliers se débloquent au fil de la valeur que vous générez chez Relio."
            action={
              <Button variant="secondary" onClick={() => void load()}>
                Actualiser
              </Button>
            }
          />
        ) : (
          <ol className="space-y-2">
            {timeline.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  {entry.emoji ? <span aria-hidden="true">{entry.emoji}</span> : null}
                  <span className="font-medium">{entry.label}</span>
                  <Badge variant="outline">
                    {entry.kind === 'BADGE' ? 'Badge' : 'Récompense'}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFCFA(entry.margeXAF)}
                  {entry.claimed ? ' · en cours de traitement' : ''}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}