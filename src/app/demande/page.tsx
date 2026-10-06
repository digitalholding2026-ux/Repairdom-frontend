import type { Metadata } from 'next';
import { DemandeWizard } from '@/components/client/demande-wizard';
import { PageHeader } from '@/components/ui/page-header';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';

/* Chantier D2 — tunnel de demande PUBLIQUE (demande d'abord, inscription à la
 * fin).
 *
 * Route volontairement hors de `/client` : elle est donc hors du `RoleGuard`
 * CLIENT du layout `/client/layout.tsx`, et c'est exactement ce qu'on veut —
 * un visiteur sans compte doit pouvoir décrire sa panne. Aucun `RoleGuard`
 * n'est ajouté ici : `app/layout.tsx` n'en monte aucun, et c'est correct.
 *
 * Le `PublicHeader` est rendu explicitement (le layout racine ne le monte pas :
 * il ne le fait que la landing). Il affiche « Connexion » au visiteur non
 * connecté, ce qui donne la porte de sortie à qui a déjà un compte. */

export const metadata: Metadata = {
  title: 'Décrire ma panne',
  description:
    'Décrivez votre panne sans créer de compte : votre progression est enregistrée et vous pourrez finaliser ensuite.',
};

export default function DemandePage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6 sm:py-10">
        <PageHeader
          title="Décrivez votre panne"
          description="Quatre étapes, sans compte obligatoire. Vous créerez votre compte à la fin."
          backHref="/"
        />
        <DemandeWizard />
      </main>
      <PublicFooter />
    </>
  );
}