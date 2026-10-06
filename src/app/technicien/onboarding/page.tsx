'use client';

/* Chantier #5C — page `/technicien/onboarding`.
 *
 * Vue d'ensemble de l'installation : les 4 étapes dans l'ordre, leur statut,
 * et un lien vers la page qui débloque chacune. Accessible par la checklist du
 * dashboard, par la bannière, ou par URL directe.
 *
 * La garde d'accès est héritée du layout `/technicien` (`RoleGuard`), comme
 * les autres pages de l'espace : rien à re-vérifier ici.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import {
  OnboardingProgressBar,
} from '@/components/technician/onboarding/onboarding-progress-bar';
import type { OnboardingStepId } from '@/lib/technician/onboarding-steps';
import { useOnboardingState } from '@/lib/technician/use-onboarding-state';

const STEP_ICONS: Record<OnboardingStepId, IconName> = {
  profile: 'user',
  kyc: 'shield-check',
  zones: 'pin',
  available: 'truck',
};

export default function TechnicianOnboardingPage() {
  const state = useOnboardingState();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finalisez votre installation"
        description="4 étapes pour commencer à recevoir des missions."
      />

      {state.error ? (
        <EmptyState
          title="Progression indisponible"
          description={state.error}
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          }
        />
      ) : state.loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Chargement de votre progression…
        </div>
      ) : state.isComplete ? (
        /* ── État 100 % ───────────────────────────────────────────────
         * L'onboarding n'a plus rien à offrir : on ne réaffiche donc PAS
         * la liste des 4 étapes cochées, qui n'apporte aucune information
         * et repousse l'action utile (voir les missions). */
        <section
          aria-labelledby="onboarding-complete-title"
          className="rounded-2xl border border-border bg-card p-6 text-center"
        >
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Icon name="check-circle" size="lg" className="text-emerald-500" />
          </span>
          <h2
            id="onboarding-complete-title"
            className="mt-3 text-lg font-semibold text-foreground"
          >
            Vous êtes prêt à recevoir des missions !
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Votre profil est complet, votre identité vérifiée, vos zones sont
            définies et vous êtes disponible. Le dispatch peut maintenant vous
            proposer des missions dans vos zones.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link href="/technicien/demandes">
              <Button>
                Voir les missions disponibles
                <span aria-hidden="true"> →</span>
              </Button>
            </Link>
            <Link href="/technicien">
              <Button variant="secondary">Retour au dashboard</Button>
            </Link>
          </div>
        </section>
      ) : (
        <>
          <OnboardingProgressBar
            completedCount={state.completedCount}
            totalCount={state.totalCount}
            label="Progression de votre installation"
          />

          <ol className="space-y-3">
            {state.steps.map((step) => {
              /* `aria-current="step"` : l'étape est l'action À FAIRE, pas
               * seulement la première incomplète — un technicien peut avoir
               * validé l'identité et rechuter sur les zones. */
              const isNext = state.next?.id === step.id;
              return (
                <li key={step.id}>
                  <section
                    aria-current={isNext ? 'step' : undefined}
                    className={`rounded-2xl border bg-card p-4 ${
                      isNext ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          step.done
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : isNext
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {step.done ? (
                          <Icon name="check" size="sm" />
                        ) : (
                          step.position
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-foreground">
                            {step.title}
                          </h2>
                          <span
                            className={`inline-flex items-center gap-1 text-xs ${
                              step.done ? 'text-emerald-600' : 'text-muted-foreground'
                            }`}
                          >
                            <Icon
                              name={step.done ? 'check-circle' : STEP_ICONS[step.id]}
                              size="xs"
                            />
                            {step.done ? 'Terminé' : 'À faire'}
                            <span className="sr-only">
                              {step.done ? ' — étape terminée' : ' — étape à compléter'}
                            </span>
                          </span>
                          {isNext ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              Prochaine étape
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {step.description}
                        </p>
                        {!step.done ? (
                          <Link href={step.href} className="mt-3 inline-block">
                            <Button size="sm">
                              Compléter
                              <span className="sr-only"> : {step.title}</span>
                              <span aria-hidden="true"> →</span>
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </li>
              );
            })}
          </ol>

          <div>
            <Link href="/technicien">
              <Button variant="secondary">Retour au dashboard</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
