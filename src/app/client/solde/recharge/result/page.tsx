'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import {
  getTopupIntent,
  verifyTopupIntent,
  type TopupIntent,
} from '@/lib/api/finance-service';
import { formatCurrency, formatDateTime } from '@/lib/format';

/* Retour navigateur SasPay → Relio (?intent=TOPUP-…).
 * Ce retour NE prouve jamais le paiement : la page relit le statut RÉEL
 * du TopupIntent côté backend (webhook/vérification serveur), avec une
 * actualisation douce (quelques essais espacés + bouton manuel, jamais de
 * polling agressif). */
const AUTO_REFRESH_ATTEMPTS = 6;
const AUTO_REFRESH_INTERVAL_MS = 5000;

export default function RechargeResultPage() {
  const [reference, setReference] = useState<string | null>(null);
  const [intent, setIntent] = useState<TopupIntent | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attempts = useRef(0);

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
      setError(err instanceof Error ? err.message : 'Statut indisponible.');
      return null;
    }
  }, []);

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    attempts.current = 0;
    setLoading(true);
    load(reference).finally(() => {
      if (!cancelled) setLoading(false);
    });
    timer = setInterval(async () => {
      if (cancelled) return;
      attempts.current += 1;
      const status = await load(reference);
      if (status !== 'PENDING' || attempts.current >= AUTO_REFRESH_ATTEMPTS) {
        if (timer) clearInterval(timer);
      }
    }, AUTO_REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [reference, load]);

  async function verifyNow() {
    if (!reference || verifying) return;
    setVerifying(true);
    try {
      const { intent: current } = await verifyTopupIntent(reference);
      if (current) setIntent(current);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vérification impossible.');
    } finally {
      setVerifying(false);
    }
  }

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
                Paiement en attente de confirmation. Validez la demande sur votre téléphone
                si ce n&apos;est pas fait, puis actualisez.
              </Alert>
            ) : null}
            {intent.status === 'SUCCESS' ? (
              <Alert variant="success">
                Recharge confirmée — votre solde a été crédité
                {intent.netAmount ? ` (${formatCurrency(intent.netAmount, intent.currency)})` : ''}.
              </Alert>
            ) : null}
            {intent.status === 'FAILED' ? (
              <Alert variant="error">
                Paiement en échec{intent.errorMessage ? ` — ${intent.errorMessage}` : ''}.
                Aucun débit : vous pouvez créer une nouvelle recharge.
              </Alert>
            ) : null}
            {intent.status === 'CANCELLED' ? (
              <Alert variant="error">Paiement annulé — aucun débit.</Alert>
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

function StatusBadge({ status }: { status: TopupIntent['status'] }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-muted text-muted-foreground',
    SUCCESS: 'bg-success-soft text-success-ink',
    FAILED: 'bg-error-soft text-error-ink',
    CANCELLED: 'bg-error-soft text-error-ink',
  };
  const labels: Record<string, string> = {
    PENDING: 'En attente',
    SUCCESS: 'Confirmée',
    FAILED: 'Échouée',
    CANCELLED: 'Annulée',
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-2xs font-medium ${styles[status] ?? styles.PENDING}`}>
      {labels[status] ?? status}
    </span>
  );
}
