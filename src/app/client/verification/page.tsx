'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { verifyEmail, resendVerification, homePathForRole } from '@/lib/api/auth-service';
import { useAuth } from '@/components/auth/auth-provider';

export default function VerificationPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const token = params.get('token');
  const emailParam = params.get('email');

  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manualEmail, setManualEmail] = useState(emailParam ?? '');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const session = await verifyEmail(token);
        if (cancelled) return;
        setVerified(true);
        await refresh();
        router.replace(homePathForRole(session.user.role));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Lien de vérification invalide ou expiré.');
        setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const handleResend = async () => {
    if (!manualEmail.trim()) return;
    setResendBusy(true);
    setResendSent(false);
    setError(null);
    try {
      await resendVerification(manualEmail.trim());
      setResendSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\u2019envoi.');
    } finally {
      setResendBusy(false);
    }
  };

  if (verifying) {
    return (
      <AuthCard icon="shield-check" title="Vérification en cours…" description="Activation de votre compte.">
        <div className="flex items-center justify-center py-10">
          <Spinner size="lg" />
        </div>
      </AuthCard>
    );
  }

  if (verified) {
    return (
      <AuthCard icon="check-circle" title="Adresse email vérifiée" description="Redirection vers votre espace…">
        <div className="flex items-center justify-center py-10">
          <Spinner size="lg" />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon="shield-check"
      title="Vérifiez votre adresse email"
      description={
        error
          ? undefined
          : 'Un email de confirmation vous a été envoyé. Ouvrez le lien pour activer votre compte RepairDom.'
      }
    >
      {error ? (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <p className="mb-4 text-sm text-muted-foreground">
        Si l&apos;email ne s&apos;affiche pas dans votre boîte de réception, pensez à vérifier vos
        courriers indésirables (spam).
      </p>

      <div className="space-y-4">
        <Field label="Renvoyer l&apos;email à l&apos;adresse :" htmlFor="resend-email">
          <Input
            id="resend-email"
            type="email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="vous@exemple.com"
            autoComplete="email"
          />
        </Field>

        {resendSent ? (
          <Alert variant="success" dense>
            Un nouveau lien vous a été envoyé.
          </Alert>
        ) : null}

        <Button
          className="w-full"
          size="lg"
          onClick={handleResend}
          disabled={!manualEmail.trim()}
          isLoading={resendBusy}
        >
          Renvoyer l&apos;email
        </Button>
      </div>
    </AuthCard>
  );
}