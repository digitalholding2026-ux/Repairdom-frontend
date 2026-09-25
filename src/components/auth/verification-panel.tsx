'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/components/auth/auth-provider';
import {
  verifyEmail,
  resendVerification,
  logout,
  EMAIL_ALREADY_VERIFIED_MESSAGE,
  VERIFICATION_LINK_INVALID_MESSAGE,
} from '@/lib/api/auth-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

export type VerificationRole = 'CLIENT' | 'TECHNICIAN';

interface VerificationPanelProps {
  role: VerificationRole;
}

/* Parcours de vérification email (CLIENT et TECHNICIEN, logique identique).
 *
 * Règles garanties ici, sans toucher au backend :
 * - l’adresse affichée est en lecture seule : paramètre d’URL (inscription,
 *   connexion refusée, conflit 409) ou session existante. AUCUN champ
 *   éditable, donc aucun changement d’adresse depuis ce parcours ;
 * - le renvoi vise uniquement cette adresse (POST /auth/resend-verification,
 *   silencieux côté backend si le compte est inconnu ou déjà vérifié) ;
 * - après clic sur le lien : l’email est marqué vérifié, toute session
 *   éventuellement posée par la réponse est immédiatement jetée (logout),
 *   puis redirection MANUELLE vers la connexion — jamais de Dashboard
 *   automatique, jamais de session utilisable ;
 * - sans adresse connue : aucun renvoi possible, orientation vers la
 *   connexion (dont l’échec « non vérifié » reboucle ici avec l’adresse).
 *
 * Survit au refresh : l’adresse transite par l’URL, le token aussi. Aucun
 * mot de passe stocké, aucun token conservé côté frontend. */
export function VerificationPanel({ role }: VerificationPanelProps) {
  const params = useSearchParams();
  const token = params.get('token');
  const emailParam = params.get('email');
  const { user, refresh } = useAuth();
  const loginHref = role === 'TECHNICIAN' ? '/technicien/connexion' : '/client/connexion';

  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const accountEmail = emailParam?.trim() || user?.email || null;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await verifyEmail(token);
        if (cancelled) return;
        // La vérification n’est PAS une authentification : jeter toute
        // session éventuelle avant d’orienter vers la connexion manuelle.
        try {
          await logout();
        } catch {
          // La déconnexion est un nettoyage opportuniste, jamais bloquant.
        }
        try {
          await refresh();
        } catch {
          // ignore — l’état local suffit pour afficher la confirmation.
        }
        if (cancelled) return;
        setVerified(true);
      } catch (err) {
        if (cancelled) return;
        const message = toUserErrorMessage(err, VERIFICATION_LINK_INVALID_MESSAGE);
        if (message === EMAIL_ALREADY_VERIFIED_MESSAGE) {
          setAlreadyVerified(true);
        } else {
          setError(message);
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  const handleResend = async () => {
    if (!accountEmail || resendBusy) return;
    setResendBusy(true);
    setResendSent(false);
    setError(null);
    try {
      await resendVerification(accountEmail);
      setResendSent(true);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors de l\u2019envoi.'));
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
      <AuthCard
        icon="check-circle"
        title="Adresse email vérifiée"
        description="Votre compte est activé. Connectez-vous pour accéder à votre espace."
      >
        <Link href={loginHref} className="block">
          <Button className="w-full" size="lg">
            Aller à la connexion
          </Button>
        </Link>
      </AuthCard>
    );
  }

  if (alreadyVerified) {
    return (
      <AuthCard
        icon="check-circle"
        title="Adresse déjà vérifiée"
        description="Cette adresse a déjà été vérifiée. Connectez-vous pour accéder à votre espace."
      >
        <Link href={loginHref} className="block">
          <Button className="w-full" size="lg">
            Aller à la connexion
          </Button>
        </Link>
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
          : 'Un email de confirmation vous a été envoyé. Ouvrez le lien pour activer votre compte Relio.'
      }
    >
      {error ? (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      ) : null}

      {accountEmail ? (
        <>
          <p className="mb-1 text-sm text-muted-foreground">Un email de vérification a été envoyé à :</p>
          <p className="mb-4 break-all text-sm font-semibold">{accountEmail}</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Si l&apos;email ne s&apos;affiche pas dans votre boîte de réception, pensez à vérifier
            vos courriers indésirables (spam).
          </p>

          <div className="space-y-3">
            <p className="text-sm font-medium">Vous n&apos;avez pas reçu l&apos;email ?</p>
            {resendSent ? (
              <Alert variant="success" dense>
                Un nouveau lien vous a été envoyé.
              </Alert>
            ) : null}
            <Button
              className="w-full"
              size="lg"
              onClick={handleResend}
              isLoading={resendBusy}
            >
              Renvoyer l&apos;email de vérification
            </Button>
          </div>
        </>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          Adresse inconnue. Repassez par la connexion : si votre compte n&apos;est pas encore
          vérifié, vous reviendrez ici automatiquement.
        </p>
      )}

      <Link href={loginHref} className="mt-4 block">
        <Button variant="secondary" className="w-full">
          Retour à la connexion
        </Button>
      </Link>
    </AuthCard>
  );
}
