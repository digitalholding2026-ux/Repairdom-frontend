'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/components/auth/auth-provider';
import {
  verifyEmail,
  resendVerification,
  EMAIL_ALREADY_VERIFIED_MESSAGE,
  VERIFICATION_LINK_INVALID_MESSAGE,
} from '@/lib/api/auth-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import {
  forgetVerifiedToken,
  readVerifiedToken,
  rememberVerifiedToken,
} from '@/lib/demande-draft-storage';

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
 * - après clic sur le lien : l’email est marqué vérifié et la session posée
 *   par la réponse est CONSERVÉE. Depuis D2.5 le backend pose un cookie dès
 *   l’inscription, et `verify-email` le repose : déconnecter immédiatement
 *   après était une friction sans gain de sécurité. Ce retrait a surtout
 *   supprimé la cause du symptôme « aucune confirmation » (voir
 *   `handleConfirm`) ;
 * - sans adresse connue : aucun renvoi possible, orientation vers la
 *   connexion (dont l’échec « non vérifié » reboucle ici avec l’adresse).
 *
 * Survit au refresh : l’adresse transite par l’URL, le token aussi. Aucun
 * mot de passe stocké, aucun token conservé côté frontend. */
/* Délai avant de re-demander l'état au backend si `emailVerified` n'a pas
 * suivi la vérification. */
/* Délai avant d'enchaîner automatiquement sur la liste des demandes, le temps
 * que l'utilisateur voie la confirmation. */
const VERIFIED_LEAVE_DELAY_MS = 1600;

/* Animation de confirmation « e-mail vérifié ».
 *
 * CSS uniquement : `animate-pop-in` et `animate-breathe` existent déjà dans
 * `globals.css`. Aucune animation Lottie n'a été ajoutée — les seules
 * disponibles parlent d'« envoi de demande », ce qui serait faux ici, et
 * `prefers-reduced-motion` est respecté par ces classes. */
function VerifiedAnimation() {
  return (
    <div className="relative mx-auto mb-1 flex size-20 items-center justify-center">
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-emerald-500/20 animate-breathe"
      />
      <span className="relative flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 animate-pop-in dark:text-emerald-400">
        <Icon name="check" size="lg" />
      </span>
    </div>
  );
}

export function VerificationPanel({ role }: VerificationPanelProps) {
  const params = useSearchParams();
  const token = params.get('token');
  const emailParam = params.get('email');
  /* Chantier D2.5 — `?from=demande` : l'utilisateur arrive ici APRÈS avoir
   * envoyé une demande depuis le tunnel public. Sa session est déjà ouverte
   * (le backend pose désormais le cookie à l'inscription), donc il ne doit pas
   * être déconnecté, et une fois vérifié on l'envoie directement vers SES
   * demandes plutôt que vers un dashboard vide. */
  const fromDemande = params.get('from') === 'demande';
  const { user } = useAuth();
  const loginHref = role === 'TECHNICIAN' ? '/technicien/connexion' : '/client/connexion';
  /* Destination après vérification réussie : l'espace du rôle. */
  const homeHref = role === 'TECHNICIAN' ? '/technicien' : '/client';

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
    /* Remontage après un `refresh()` : si ce token a déjà été validé, on
     * réaffiche la confirmation au lieu de revenir à l'écran « confirmez ».
     * Sans cela, le spinner s'affichait puis l'écran se réinitialisait sans
     * aucun message — le symptômeExact observé en production. */
    const remembered = readVerifiedToken();
    if (remembered === token) {
      setConfirming(false);
      setVerified(true);
      setVerifying(false);
      return;
    }
    /* Un token différent : l'entrée précédente ne sert plus à rien. */
    if (remembered) forgetVerifiedToken();
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
      /* CHANTIER FIX — plus de `logout()` ici.
       *
       * Le backend repose le cookie à CHAQUE `verify-email` : l'utilisateur
       * vient d'obtenir une session valide sur un compte désormais vérifié. La
       * déconnexion qui suivait relevait de l'ancien monde où l'inscription ne
       * posait AUCUN cookie (avant D2.5). Elle est devenue :
       *   1) une friction pure — il faut ressaisir son mot de passe pour rien ;
       *   2) la CAUSE du symptôme « aucune confirmation » : le `refresh()`
       *      qui suivait passait l'`AuthProvider` en `loading`, le
       *      `RoleGuard` rendait `LoadingScreen` à la place du panneau, qui se
       *      démontait et perdait son état. Le message de succès ne pouvait
       *      donc jamais s'afficher. */
      rememberVerifiedToken(token);
      /* PAS de `refresh()` ici, volontairement.
       *
       * `refresh()` fait passer l'`AuthProvider` en `loading` → le `RoleGuard`
       * rend `LoadingScreen` à la place du panneau → démontage et perte de
       * l'état, donc plus aucun message de confirmation. Et une fois le
       * contexte « vérifié », le garde renvoie automatiquement l'utilisateur
       * loin de cette page : la confirmation n'aurait pas le temps d'être
       * lue. On laisse donc le contexte tel quel — l'utilisateur VOIT la
       * confirmation, et c'est la navigation dure déclenchée par le bouton
       * qui reconstruit un contexte à jour. */
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

  /* Sortie de la page de vérification — NAVIGATION DURE, pas `router.push`.
   *
   * Pourquoi une navigation complète : c'est la seule façon de garantir un
   * contexte `AuthProvider` reconstruit par `GET /auth/me`. Une navigation
   * cliente conserverait le contexte périmé (`emailVerified: false`) et le
   * `RoleGuard` renverrait alors l'utilisateur... ici. Boucle. Le dépôt
   * utilise déjà ce mécanisme dans `logoutAndGoHome`.
   *
   * `?from=demande` : on enchaîne automatiquement sur les demandes, après un
   * court délai qui laisse l'animation de confirmation être vue.
   * Sinon : l'utilisateur choisit, via le bouton « Accéder à mon espace ». */
  const leaveVerification = (destination: string) => {
    forgetVerifiedToken();
    window.location.assign(destination);
  };

  useEffect(() => {
    if (!verified || !fromDemande) return;
    const timer = window.setTimeout(() => {
      leaveVerification('/client/demandes');
    }, VERIFIED_LEAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
    /* Une seule redirection déclenchée : `router.replace` a été retiré au
     * profit de cette navigation, donc plus aucun doublon possible. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified, fromDemande]);

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
          <VerifiedAnimation />
          <Link href="/client/demandes" className="block">
            <Button className="w-full" size="lg">
              Voir mes demandes
            </Button>
          </Link>
        </AuthCard>
      );
    }
    /* L'utilisateur est MAINTENANT connecté : `verify-email` repose le cookie
     * et la vérification est faite. Lui demander de ressaisir son mot de
     * passe n'apportait rien et ajoutait une étape — d'où « Accéder à mon
     * espace » plutôt que « Aller à la connexion ». */
    return (
      <AuthCard
        icon="check-circle"
        title="Adresse email vérifiée"
        description="Votre compte est activé et vous êtes connecté."
      >
        <VerifiedAnimation />
        <Button className="w-full" size="lg" onClick={() => leaveVerification(homeHref)}>
          Accéder à mon espace
        </Button>
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
        <VerifiedAnimation />
        <Button className="w-full" size="lg" onClick={() => leaveVerification(fromDemande ? '/client/demandes' : homeHref)}>
          {fromDemande ? 'Voir mes demandes' : 'Accéder à mon espace'}
        </Button>
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
