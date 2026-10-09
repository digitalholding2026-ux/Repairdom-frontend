'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { getMe, homePathForRole } from '@/lib/api/auth-service';
import {
  REFERRAL_MAX_REFERRALS,
  REFERRAL_REWARD_XAF,
  REFERRAL_STATUS_LABEL,
  getMyReferrals,
  isReferralExpired,
  type MyReferrals,
  type ReferralRow,
} from '@/lib/api/referrals-service';
import { formatFCFA } from '@/lib/format-fcfa';
import { formatDate } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { ParrainageSkeleton } from '@/components/client/parrainage/parrainage-skeleton';

/**
 * Chantier 4B — Page « Mes parrainages ».
 *
 * Refonte de la page qui n'affichait qu'un code FABRIQUÉ côté client
 * (`RD-${userId.slice(0,6)}`) et annonçait explicitement qu'aucun crédit n'était
 * attribué. C'était exact : aucun mécanisme n'existait. Le code est désormais
 * généré et persisté par le backend, et la récompense est réelle.
 *
 * Le lien de partage est celui CONSTRUIT PAR LE BACKEND (`shareUrl`), pas
 * recomposé ici : il est la seule source qui connaît le préfixe, le
 * paramètre attendu et le domaine public. Le frontend ne fait que le recopier
 * — une divergence de format casserait silencieusement le lien partagé.
 *
 * Montants : entiers XAF venus du serveur, formatés à l'affichage par
 * `formatFCFA`. Aucun montant n'est formaté en amont.
 */

/** Progression : barre + compteur, avec un libellé qui reste juste à 5/5. */
function ProgressionBar({ used, max }: { used: number; max: number }) {
  const percent = Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold tabular-nums">
          {used} / {max} filleuls
        </span>
        <span className="text-xs text-muted-foreground">
          {used >= max ? 'Limite atteinte' : `${max - used} place${max - used > 1 ? 's' : ''} restante${max - used > 1 ? 's' : ''}`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label="Progression du parrainage"
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Une ligne de la liste des filleuls. */
function ReferralLine({ referral }: { referral: ReferralRow }) {
  const variant: BadgeVariant =
    referral.status === 'REWARDED'
      ? 'success'
      : referral.status === 'EXPIRED'
        ? 'neutral'
        : referral.status === 'REGISTERED'
          ? 'info'
          : 'neutral';
  const name =
    referral.referredName ||
    referral.referredEmail ||
    /* Ni nom ni e-mail : un lien partagé n'a pas encore de porteur. */
    'Invitation en cours';

  return (
    <li className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(referral.createdAt)}
        </p>
        {referral.rewardedAt ? (
          <p className="text-xs text-muted-foreground">
            Récompensé le {formatDate(referral.rewardedAt)}
          </p>
        ) : null}
      </div>
      <Badge variant={variant} className="shrink-0">
        {REFERRAL_STATUS_LABEL[referral.status]}
      </Badge>
    </li>
  );
}

export default function ClientParrainagePage() {
  const router = useRouter();
  const [data, setData] = useState<MyReferrals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [shared, setShared] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getMyReferrals());
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de charger vos parrainages.'));
    } finally {
      setLoading(false);
    }
  }, []);

  /* Garde de rôle : la page n'est utile qu'à un CLIENT. On ne s'appuie pas
   * sur le `RoleGuard` du layout pour le contenu, mais sur la même source. */
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        if (me.role !== 'CLIENT') {
          router.replace(homePathForRole(me.role));
          return;
        }
        void load();
      })
      .catch(() => router.replace('/client/connexion'));
    return () => {
      cancelled = true;
    };
  }, [router, load]);

  const copy = async (value: string, which: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      /* Le retour visuel dure 2 s : au-delà, l'utilisateur a oublié ce qu'il
       * a copié et clique deux fois. */
      window.setTimeout(() => setCopied(null), 2_000);
    } catch {
      /* Presse-papiers refusé (contexte non sécurisé) : on ne casse rien,
       * le texte reste sélectionnable à l'écran. */
      setCopied(null);
    }
  };

  const share = async () => {
    if (!data) return;
    const payload = {
      title: 'Relio — invite et gagne',
      text: `Rejoins Relio avec mon lien : vous recevez chacun ${formatFCFA(REFERRAL_REWARD_XAF)} de crédit.`,
      url: data.shareUrl,
    };
    /* Web Share n'est disponible que sur mobile (et sur quelques navigateurs
     * de bureau) : le bouton n'est rendu que là où la fonction existe, sinon
     * l'utilisateur cliquerait et rien ne se passerait. */
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        setShared(true);
        window.setTimeout(() => setShared(false), 2_000);
      } catch {
        /* Partage annulé par l'utilisateur : ce n'est pas une erreur. */
      }
    }
  };

  if (loading) return <ParrainageSkeleton />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invitez vos amis"
        description={`Gagnez ${formatFCFA(REFERRAL_REWARD_XAF)} de crédit par ami validé.`}
        backHref="/client"
      />

      {error ? (
        <Alert variant="error">
          {error}
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={() => { setLoading(true); void load(); }}>
              Réessayer
            </Button>
          </div>
        </Alert>
      ) : null}

      {data ? (
        <>
          {/* ── Code + lien ─────────────────────────────────────────────── */}
          <Card>
            <CardContent className="space-y-4 pt-4 sm:pt-5">
              <SectionHeader title="Mon code de parrainage" icon="users" />
              <div className="rounded-2xl bg-muted/40 px-4 py-5 text-center">
                <p className="font-mono text-3xl font-bold tracking-widest text-primary">
                  {data.code}
                </p>
              </div>
              <Button variant="secondary" className="w-full" onClick={() => copy(data.code, 'code')}>
                <Icon name={copied === 'code' ? 'check' : 'copy'} size="sm" />
                {copied === 'code' ? 'Code copié !' : 'Copier mon code'}
              </Button>

              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Mon lien de partage
                </p>
                <p className="break-all rounded-lg bg-muted/40 p-3 font-mono text-xs">
                  {data.shareUrl}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => copy(data.shareUrl, 'link')}
                  >
                    <Icon name={copied === 'link' ? 'check' : 'copy'} size="sm" />
                    {copied === 'link' ? 'Lien copié !' : 'Copier le lien'}
                  </Button>
                  {/* Web Share : mobile seulement (cf. handler). */}
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                    <Button className="flex-1" onClick={share}>
                      <Icon name="send" size="sm" />
                      {shared ? 'Partagé !' : 'Partager'}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Progression ──────────────────────────────────────────────── */}
          <Card>
            <CardContent className="space-y-3 pt-4 sm:pt-5">
              <SectionHeader title="Ma progression" icon="sparkles" />
              <ProgressionBar used={data.usedSlots} max={data.maxReferrals} />
              <p className="text-sm text-muted-foreground">
                {data.rewardedCount > 0 ? (
                  <>
                    Vous avez déjà reçu{' '}
                    <span className="font-semibold text-foreground">
                      {formatFCFA(data.rewardedCount * REFERRAL_REWARD_XAF)}
                    </span>{' '}
                    de crédit de parrainage.
                  </>
                ) : (
                  'Aucune récompense pour le moment : vos amis doivent confirmer leur première intervention.'
                )}
              </p>
              {data.usedSlots >= data.maxReferrals ? (
                <Alert variant="neutral" dense icon="info">
                  Vous avez atteint la limite de {data.maxReferrals} filleuls. Vos invitations
                  existantes restent valides, mais un nouvel ami ne sera pas rattaché à vous.
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          {/* ── Liste des filleuls ───────────────────────────────────────── */}
          <Card>
            <CardContent className="space-y-3 pt-4 sm:pt-5">
              <SectionHeader title="Mes filleuls" icon="users" />
              {data.referrals.length === 0 ? (
                <EmptyState
                  icon={<Icon name="users" size="md" />}
                  title="Aucune invitation pour l'instant"
                  description="Partagez votre code ou votre lien : chaque ami validé vous rapporte 500 FCFA de crédit."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {data.referrals.map((referral) => (
                    <ReferralLine key={referral.id} referral={referral} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* ── Comment ça marche ─────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-3 pt-4 sm:pt-5">
          <SectionHeader title="Comment ça marche ?" icon="info" />
          <ol className="space-y-3 text-sm">
            {[
              'Partagez votre code ou votre lien.',
              'Votre ami s’inscrit avec ce code.',
              'Il fait sa première intervention.',
              `Vous recevez tous les deux ${formatFCFA(REFERRAL_REWARD_XAF)} de crédit.`,
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary"
                >
                  {index + 1}
                </span>
                <span className="text-foreground">{step}</span>
              </li>
            ))}
          </ol>
          <Alert variant="info" dense icon="shield">
            La récompense est versée uniquement après la première intervention
            confirmée de votre ami : l&apos;invitation seule ne rapporte rien.
          </Alert>
        </CardContent>
      </Card>

      <Link href="/client" className="block">
        <Button variant="secondary" className="w-full">
          Retour à l&apos;accueil
        </Button>
      </Link>
    </div>
  );
}