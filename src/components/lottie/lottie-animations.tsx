'use client';

import { LottieAnimation } from '@/components/ui/lottie-animation';
import ussdRechargeData from '../../../animatio json/code  USSD Envoyer pour recharge.json';
import demandeEnvoyeeData from '../../../animatio json/demande envoyer.json';
import erreur404Data from '../../../animatio json/erreur 404.json';
import menuNavData from '../../../animatio json/menu nav.json';
import rechercheTechnicienData from '../../../animatio json/recherche de technicien.json';
import whatsappData from '../../../animatio json/social media whatsapp.json';

/* MISSION LottieFlow — table de correspondance (audit des JSON) :
 *
 * | Usage                  | Fichier (nom réel, non renommé)          | Poids |
 * |------------------------|------------------------------------------|-------|
 * | Recharge / USSD envoyé | `code  USSD Envoyer pour recharge.json` | 10 Ko |
 * | Demande envoyée        | `demande envoyer.json`                   | 80 Ko |
 * | Erreur 404 / technique | `erreur 404.json`                        | 37 Ko |
 * | Menu mobile            | `menu nav.json`                          | 16 Ko |
 * | Recherche technicien   | `recherche de technicien.json`           |  9 Ko |
 * | WhatsApp               | `social media whatsapp.json`             | 25 Ko |
 *
 * Chaque wrapper importe UN seul JSON (code-splitting par page) et impose
 * une taille maximale raisonnable par support (jamais de width:100% nu).
 * Tous vectoriels (aucune image embarquée/dépendance externe).
 */

function sizes(mobile: string, desktop: string): string {
  return `${mobile} sm:${desktop}`;
}

/** Recharge en cours / USSD envoyé (feedback de traitement, jamais de succès). */
export function UssdRechargeAnimation({ className }: { className?: string }) {
  return (
    <LottieAnimation
      animationData={ussdRechargeData}
      label="Recharge en cours"
      className={className ?? sizes('h-28 w-28', 'h-36 w-36')}
    />
  );
}

/** Demande créée (succès backend confirmé uniquement). Loop unique. */
export function DemandeEnvoyeeAnimation({ className }: { className?: string }) {
  return (
    <LottieAnimation
      animationData={demandeEnvoyeeData}
      loop={false}
      label="Demande envoyée"
      className={className ?? sizes('h-40 w-40', 'h-48 w-48')}
    />
  );
}

/** Page introuvable / indisponibilité technique (écran d'erreur prévu). */
export function Erreur404Animation({ className }: { className?: string }) {
  return (
    <LottieAnimation
      animationData={erreur404Data}
      className={className ?? sizes('h-48 w-48', 'h-56 w-56')}
    />
  );
}

/** Déclencheur visuel du menu MOBILE uniquement (rejoue à chaque toggle). */
export function MenuNavAnimation({
  playKey,
  className,
}: {
  playKey?: string | number;
  className?: string;
}) {
  return (
    <LottieAnimation
      animationData={menuNavData}
      loop={false}
      playKey={playKey}
      className={className ?? 'size-6'}
    />
  );
}

/** Recherche d'un technicien (statut backend réel uniquement, en boucle). */
export function RechercheTechnicienAnimation({ className }: { className?: string }) {
  return (
    <LottieAnimation
      animationData={rechercheTechnicienData}
      label="Recherche d'un technicien disponible"
      className={className ?? sizes('h-24 w-24', 'h-32 w-32')}
    />
  );
}

/** Marque WhatsApp discrète (décorative, champs de saisie du numéro). */
export function WhatsAppMark({ className }: { className?: string }) {
  return (
    <LottieAnimation
      animationData={whatsappData}
      loop={false}
      className={className ?? 'size-5'}
    />
  );
}
