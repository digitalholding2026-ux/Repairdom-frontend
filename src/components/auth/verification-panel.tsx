'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
/* Délai avant de re-demander l'état au backend si `emailVerified` n'a pas
 * suivi la vérification. */
const EMAIL_VERIFIED_RETRY_MS = 1500;

export function VerificationPanel({ role }: VerificationPanelProps) {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const emailParam = params.get('email');
  /* Chantier D2.5 — `?from=demande` : l'utilisateur arrive ici APRÈS avoir
   * envoyé une demande depuis le tunnel public. Sa session est déjà ouverte
   * (le backend pose désormais le cookie à l'inscription), donc il ne doit pas
   * être déconnecté, et une fois vérifié on l'envoie directement vers SES
   * demandes plutôt que vers un dashboard vide. */
  const fromDemande = params.get('from') === 'demande';
  const { user, refresh } = useAuth();
  const loginHref = role === 'TECHNICIAN' ? '/technicien/connexion' : '/client/connexion';

  /* `confirming` : le token est présent dans l'URL mais RIEN n'a encore été
   * envoyé. Écran de confirmation — voir `handleConfirm`. */
  const [confirming, setConfirming] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  /* Garde anti-double-appel : un second clic, un re-render ou un remontage du
   * composant ne doit pas renvoyer le POST. */
  const verificationAttempted = useRef(false);

  const accountEmail = emailParam?.trim() || user?.email || null;

  /* Écran de confirmation dès qu'un token est présent — AUCUN appel réseau au
   * chargement.
   *
   * CHANTIER FIX — pourquoi ne plus vérifier automatiquement : Gmail, Outlook
   * SafeLinks et les scanners antivirus visitent les liens des e-mails pour
   * vérifier qu'ils ne sont pas malveillants. Certains exécutent le
   * JavaScript. Avec la vérification automatique au montage, ce scanner
   * consommait le token À LA PLACE de l'utilisateur : quand celui-ci cliquait
   * pour de vrai, le token avait déjà été brûlé et le backend répondait « lien
   * invalide ou expiré ». Un scanner ne clique PAS sur un bouton : il se
   * contente de charger la page. Le token reste donc intact jusqu'au clic
   * humain. */
  useEffect(() => {
    if (!token) return;
    setConfirming(true);
    setVerifying(false);
  }, [token]);

  /* Clic sur « Confirmer mon email ». Seul moment où le token est consumé. */
  const handleConfirm = async () => {
    if (!token || verificationAttempted.current) return;
    verificationAttempted.current = true;
    setVerifying(true);
    setError(null);
    setConfirming(false);
    try {
      const session = await verifyEmail(token);
      /* La session posée par la réponse est conservée si le visiteur vient du
       * tunnel de demande (D2.5 pose le cookie dès l'inscription). Sinon elle
       * est jetée : la vérification n'est pas une authentification, et le
       * parcours historique redirige manuellement vers la connexion. */
      if (!fromDemande) {
        try {
          await logout();
        } catch {
          // La déconnexion est un nettoyage opportuniste, jamais bloquant.
        }
      }
      try {
        await refresh();
      } catch {
        // ignore — l’état local suffit pour afficher la confirmation.
      }
      /* `alreadyVerified` : le backend répond 200 sans rien écrire (rejeu du
       * lien, clic déjà effectué par un scan ou une autre session). Ce n'est
       * pas une erreur, et surtout pas un 400 qui ferait croire à un échec. */
      if (session.alreadyVerified) setAlreadyVerified(true);
      else setVerified(true);
    } catch (err) {
      const message = toUserErrorMessage(err, VERIFICATION_LINK_INVALID_MESSAGE);
      if (message === EMAIL_ALREADY_VERIFIED_MESSAGE) {
        setAlreadyVerified(true);
      } else {
        /* Token réellement invalide ou expiré : on ne laisse pas l'utilisateur
         * devant un cul-de-sac, on lui propose le renvoi. */
        setError(message);
        verificationAttempted.current = false;
      }
    } finally {
      setVerifying(false);
    }
  };

  /* Redirection vers la liste des demandes, une fois le contexte à jour.
   *
   * ⚠️ PAS de « timeout de sécurité » qui pousserait quand même : si
   * `emailVerified` ne se synchronise pas, pousser vers `/client/demandes`
   * ferait reboucler le `RoleGuard` vers `/client/verification` — c'est
   * exactement la boucle infinie que ce chantier corrige. On reste donc sur la
   * page et l'utilisateur y trouve le bouton « Voir mes demandes ».
   *
   * À la place, on RÉACTUALISE : si le contexte est toujours en retard après
   * le délai, on rappelle `refresh()`. Le filet sert à rattraper un cookie
   * appliqué tardivement, pas à forcer une navigation. */
  useEffect(() => {
    if (!verified || !fromDemande) return;
    if (!user?.emailVerified) return;
    router.replace('/client/demandes');
  }, [verified, fromDemande, user?.emailVerified, router]);

  useEffect(() => {
    if (!verified || !fromDemande) return;
    if (user?.emailVerified) return;
    const timer = window.setTimeout(() => {
      void refresh();
    }, EMAIL_VERIFIED_RETRY_MS);
    return () => window.clearTimeout(timer);
  }, [verified, fromDemande, user?.emailVerified, refresh]);

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

  /* Écran de confirmation : le token est là, on n'a encore rien envoyé. */
  if (confirming) {
    return (
      <AuthCard
        icon="shield"
        title="Confirmez votre adresse email"
        description="Cliquez sur le bouton ci-dessous pour vérifier votre adresse."
      >
        <Button
          className="w-full"
          size="lg"
          onClick={handleConfirm}
          isLoading={verifying}
        >
          Confirmer mon email
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Cette étape est volontairement déclenchée par votre clic : certains
          services de messagerie testent automatiquement les liens pour vérifier
          qu&apos;ils ne sont pas malveillants, ce qui épuiserait votre lien
          avant que vous ne le cliquiez.
        </p>
      </AuthCard>
    );
  }

  if (verified) {
    /* Cas du tunnel de demande : la session existe déjà, on propose donc la
     * liste des missions (où se trouve celle qui vient d'être envoyée) au lieu
     * d'un formulaire de connexion inutile. */
    if (fromDemande) {
      return (
        <AuthCard
          icon="check-circle"
          title="Adresse email vérifiée"
          description="Votre compte est activé. Votre demande a bien été envoyée."
        >
          <Link href="/client/demandes" className="block">
            <Button className="w-full" size="lg">
              Voir mes demandes
            </Button>
          </Link>
        </AuthCard>
      );
    }
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
    /* Ce n'est PAS une erreur : le lien a déjà été utilisé (précédent clic,
     * autre session, scanner). Message positif et action immédiate. */
    return (
      <AuthCard
        icon="check-circle"
        title="Votre email est déjà vérifié"
        description="Rien à faire, tout est en ordre."
      >
        {fromDemande ? (
          <Link href="/client/demandes" className="block">
            <Button className="w-full" size="lg">
              Voir mes demandes
            </Button>
          </Link>
        ) : (
          <Link href={loginHref} className="block">
            <Button className="w-full" size="lg">
              Aller à la connexion
            </Button>
          </Link>
        )}
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
          Ce lien a expiré ou n&apos;est plus valide. Demandez un nouveau lien
          ci-dessous pour continuer.
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
        /* « Adresse inconnue » ne voulait rien dire pour l'utilisateur : ni son
         * compte, ni sa demande n'étaient « inconnus », c'était nous qui ne
         * savions pas à quel e-mail renvoyer. On lui dit ce qui va se passer
         * et on ne lui reproche rien. */
        <p className="mb-4 text-sm text-muted-foreground">
          Nous n&apos;avons pas l&apos;adresse e-mail associée à ce compte. Si vous venez
          de vous inscrire, ouvrez le lien reçu par e-mail pour activer votre
          compte ; sinon connectez-vous, votre accès sera vérifié à ce moment-là.
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
