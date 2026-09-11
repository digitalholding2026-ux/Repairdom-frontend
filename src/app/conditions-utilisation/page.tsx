import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';

export const metadata: Metadata = {
  title: 'Conditions d\u2019utilisation',
};

export default function ConditionsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Conditions d&apos;utilisation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
          <Section title="1. Objet">
            <p>
              Les présentes conditions régissent l&apos;utilisation de la plateforme RepairDom, mise à
              disposition sous forme d&apos;application web mobile-first. En utilisant RepairDom, chaque
              utilisateur (client ou technicien) reconnaît avoir pris connaissance et accepté les
              présentes conditions.
            </p>
          </Section>

          <Section title="2. Création de compte">
            <p>
              L&apos;utilisation de RepairDom nécessite la création d&apos;un compte. Le client doit
              renseigner des informations exactes (nom, adresse e-mail, téléphone, ville et adresse
              précise). L&apos;inscription du technicien est soumise à une vérification préalable par
              l&apos;équipe RepairDom.
            </p>
          </Section>

          <Section title="3. Usage de la plateforme">
            <p>
              RepairDom est une plateforme de mise en relation entre des clients ayant un besoin de
              dépannage et des techniciens qualifiés. La plateforme ne réalise aucun acte technique
              directement ; elle facilite la coordination, le suivi et le règlement des interventions.
            </p>
          </Section>

          <Section title="4. Techniciens et vérification">
            <p>
              Les techniciens inscrits sur RepairDom font l&apos;objet d&apos;une vérification
              d&apos;identité et de qualifications par l&apos;équipe. Cette vérification ne constitue
              pas une garantie absolue sur la qualité des prestations. Les clients évaluent les
              techniciens après chaque intervention.
            </p>
          </Section>

          <Section title="5. Diagnostics et tarifs">
            <p>
              Après réception d&apos;une demande, le technicien formule un diagnostic et un devis
              prévisionnel. Le client est invité à consulter et accepter le tarif proposé avant tout
              engagement d&apos;intervention. Aucun prélèvement n&apos;est effectué sans accord
              préalable du client.
            </p>
          </Section>

          <Section title="6. Validation des interventions">
            <p>
              L&apos;acceptation du tarif par le client déclenche la planification de
              l&apos;intervention. Le technicien procède aux travaux conformément au diagnostic
              validé. Tout écart significatif doit faire l&apos;objet d&apos;un échange via la
              messagerie intégrée.
            </p>
          </Section>

          <Section title="7. Annulation">
            <p>
              Le client peut annuler une demande tant qu&apos;aucune intervention n&apos;a été
              planifiée. Une annulation après planification peut donner lieu à des conditions
              spécifiques communiquées avant la validation.
            </p>
          </Section>

          <Section title="8. Finances et solde">
            <p>
              Le solde RepairDom est un portefeuille de simulation permettant d&apos;expérimenter le
              parcours client. Les montants affichés sont fictifs et n&apos;impliquent aucun
              débit réel, encaissement ou frais. Le paiement réel des interventions fera l&apos;objet
              d&apos;une mise à jour ultérieure de la plateforme.
            </p>
          </Section>

          <Section title="9. Données personnelles">
            <p>
              Les données personnelles collectées (nom, adresse, téléphone, adresse e-mail) sont
              utilisées uniquement dans le cadre du fonctionnement de la plateforme. Elles ne sont
              jamais revendues à des tiers. La gestion des données suit la réglementation en vigueur.
            </p>
          </Section>

          <Section title="10. Responsabilité">
            <p>
              RepairDom agit en qualité d&apos;intermédiaire technique. La responsabilité de la
              bonne exécution des prestations incombe au technicien. RepairDom ne saurait être tenu
              responsable des dommages résultant d&apos;une intervention.
            </p>
          </Section>

          <Section title="11. Modification des conditions">
            <p>
              RepairDom se réserve le droit de modifier les présentes conditions. Les utilisateurs
              seront informés de tout changement significatif lors de leur prochaine connexion.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>
              Pour toute question relative aux présentes conditions, vous pouvez contacter
              l&apos;équipe RepairDom via l&apos;adresse e-mail ou le numéro de téléphone indiqués
              dans l&apos;application.
            </p>
          </Section>
        </div>

        <div className="mt-12">
          <Link href="/client/inscription">
            <Button className="w-full" size="lg">
              Retour à l&apos;inscription
            </Button>
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}