'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import {
  getTopupIntent,
  verifyTopupIntent,
  type TopupIntent,
} from '@/lib/api/finance-service';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* Retour navigateur SasPay → Relio (?intent=TOPUP-…).
 * Ce retour NE prouve jamais le paiement : la page relit le statut RÉEL
 * du TopupIntent côté backend (webhook/vérification serveur), avec une
 * actualisation douce (quelques essais espacés + UNE vérification serveur
 * automatique si le PENDING persiste + bouton manuel, jamais de polling
 * agressif). Aucun SUCCESS n'est inventé côté frontend. */
const AUTO_REFRESH_ATTEMPTS = 6;
const AUTO_REFRESH_INTERVAL_MS = 5000;

export default function RechargeResultPage() {
  const [reference, setReference] = useState<string | null>(null);
  const [intent, setIntent] = useState<TopupIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyInfo, setVerifyInfo] = useState<string | null>(null);
  // Heure de la vérification automatique (UX : le PENDING reste explicite).
  const [autoCheckedAt, setAutoCheckedAt] = useState<string | null>(null);
  const attempts = useRef(0);
  const autoVerified = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReference(params.get('intent'));
  }, []);

  const load = useCallback(async (ref: string) => {
    try {
      const { intent: current } = await getTopupIntent(ref);
      setIntent(current);
      setError(null);
      return current.status;
    } catch (err) {
      setError(toUserErrorMessage(err, 'Statut indisponible.'));
      return null;
    }
  }, []);

  /* Vérification serveur on-demand (même endpoint pour le bouton manuel et
   * la vérification automatique unique quand le PENDING persiste). Ne crée
   * jamais de SUCCESS côté frontend : le statut affiché vient du backend
   * (webhook / verify SasPay). En cas d'échec de vérification, l'intention
   * reste PENDING avec un message explicite. */
  const verifyOnce = useCallback(async (ref: string) => {
    setVerifying(true);
    setVerifyInfo(null);
    try {
      const { intent: current, verificationError } = await verifyTopupIntent(ref);
      if (current) {
        setIntent(current);
        setError(null);
      }
      if (verificationError) {
        setVerifyInfo(verificationError.message);
      } else if (current?.status === 'PENDING') {
        setVerifyInfo(
          'Vérification effectuée : le paiement reste en attente. Patientez puis relancez une vérification.',
        );
      }
    } catch (err) {
      setError(toUserErrorMessage(err, 'Vérification impossible.'));
    } finally {
      setVerifying(false);
    }
  }, []);

  async function verifyNow() {
    if (!reference || verifying) return;
    await verifyOnce(reference);
  }

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    attempts.current = 0;
    autoVerified.current = false;
    setAutoCheckedAt(null);
    setLoading(true);
    load(reference).finally(() => {
      if (!cancelled) setLoading(false);
    });
    timer = setInterval(async () => {
      if (cancelled) return;
      attempts.current += 1;
      const status = await load(reference);
      if (status !== 'PENDING') {
        if (timer) clearInterval(timer);
        return;
      }
      if (attempts.current >= AUTO_REFRESH_ATTEMPTS) {
        if (timer) clearInterval(timer);
        // Le webhook tarde : UNE vérification serveur explicite (même
        // endpoint que le bouton manuel), sans jamais inventer de statut.
        if (!autoVerified.current) {
          autoVerified.current = true;
          await verifyOnce(reference);
          if (!cancelled) setAutoCheckedAt(new Date().toISOString());
        }
      }
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [reference, load, verifyOnce]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Résultat de la recharge"
        description="État réel confirmé par Relio."
        backHref="/client/solde"
      />

      {!reference && !loading ? (
        <Alert variant="error">Référence de recharge manquante.</Alert>
      ) : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Lecture du statut…
          </CardContent>
        </Card>
      ) : null}

      {intent ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold">{intent.reference}</span>
              <StatusBadge status={intent.status} />
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {formatCurrency(intent.amount, intent.currency)}
            </p>
            {intent.status === 'PENDING' ? (
              <Alert variant="info">
                {intent.userMessage ?? 'Paiement en attente de confirmation.'} Validez la
                demande sur votre téléphone si ce n&apos;est pas fait, puis actualisez.
              </Alert>
            ) : null}
            {verifyInfo && intent.status === 'PENDING' ? (
              <Alert variant="info">{verifyInfo}</Alert>
            ) : null}
            {!verifyInfo && autoCheckedAt && intent.status === 'PENDING' ? (
              <Alert variant="info">
                Vérification automatique effectuée à{' '}
                {new Date(autoCheckedAt).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                : le paiement reste en attente. Vous pouvez relancer une vérification ou
                patienter — votre solde sera crédité dès confirmation de l&apos;opérateur.
              </Alert>
            ) : null}
            {intent.status === 'SUCCESS' ? (
              <Alert variant="success">
                {intent.userMessage ?? 'Recharge confirmée — votre solde a été crédité.'}
                {intent.netAmount ? ` (${formatCurrency(intent.netAmount, intent.currency)})` : ''}.
              </Alert>
            ) : null}
            {intent.status === 'FAILED' ? (
              <Alert variant="error">
                {intent.userMessage ?? "Le paiement n'a pas abouti."}
                Aucun débit : vous pouvez créer une nouvelle recharge.
              </Alert>
            ) : null}
            {intent.status === 'CANCELLED' ? (
              <Alert variant="error">{intent.userMessage ?? 'Paiement annulé — aucun débit.'}</Alert>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Créée le {formatDateTime(intent.createdAt)}
            </p>
            <div className="flex flex-wrap gap-2">
              {intent.status === 'PENDING' ? (
                <Button onClick={verifyNow} disabled={verifying} variant="outline">
                  {verifying ? 'Vérification…' : 'Vérifier le paiement'}
                </Button>
              ) : null}
              <Link href="/client/solde">
                <Button variant={intent.status === 'PENDING' ? 'outline' : undefined}>
                  Retour à mon solde
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/* UI-0 : badge centralisé sur le design system (`Badge`), libellés
 * métier conservés (statuts de recharge ≠ statuts de demande). */
function StatusBadge({ status }: { status: TopupIntent['status'] }) {
  const variants: Record<string, BadgeVariant> = {
    PENDING: 'neutral',
    SUCCESS: 'success',
    FAILED: 'danger',
    CANCELLED: 'danger',
  };
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    SUCCESS: 'Confirmée',
    FAILED: 'Échouée',
    CANCELLED: 'Annulée',
  };
  return (
    <Badge variant={variants[status] ?? 'neutral'} className="shrink-0">
      {labels[status] ?? status}
    </Badge>
  );
}
