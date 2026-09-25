import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';

type PreviewStepState = 'done' | 'current' | 'pending';

interface PreviewStep {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  state: PreviewStepState;
}

/* Les 5 étapes types d'un dépannage Relio (démonstration statique). */
const PREVIEW_STEPS: PreviewStep[] = [
  {
    id: 'registered',
    title: 'Demande enregistrée',
    description: 'Validation par l\u2019IA / Admin',
    icon: 'file',
    state: 'done',
  },
  {
    id: 'quote',
    title: 'Analyse & Devis',
    description: 'Technicien local assigné',
    icon: 'wrench',
    state: 'done',
  },
  {
    id: 'en-route',
    title: 'Technicien en route',
    description: 'Géolocalisation & Timing',
    icon: 'truck',
    state: 'current',
  },
  {
    id: 'on-site',
    title: 'Intervention sur site',
    description: 'Diagnostic & Réparation',
    icon: 'zap',
    state: 'pending',
  },
  {
    id: 'closure',
    title: 'Validation & Clôture',
    description: 'Libération des fonds sécurisés',
    icon: 'shield-check',
    state: 'pending',
  },
];

/* Aperçu pédagogique du suivi temps réel : timeline modèle avec étape
 * active pulsée + carte d'action rapide. Affiché quand le client n'a
 * aucune mission en cours. */
export function TrackingPreview() {
  return (
    <div>
      <p className="text-base font-semibold tracking-tight sm:text-lg">
        Comment fonctionne le suivi en temps réel ?
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Chaque mission traverse ces étapes, visibles ici minute par minute.
      </p>

      <ol className="mt-5">
        {PREVIEW_STEPS.map((step, index) => {
          const isLast = index === PREVIEW_STEPS.length - 1;
          const done = step.state === 'done';
          const current = step.state === 'current';
          return (
            <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute bottom-0 left-[15px] top-8 w-0.5',
                    done || current ? 'bg-success/60' : 'bg-slate-200 dark:bg-slate-800',
                  )}
                />
              ) : null}
              <span className="relative z-10 flex shrink-0">
                {current ? (
                  <span
                    aria-hidden
                    className="absolute inline-flex size-8 animate-ping rounded-full bg-primary/30"
                  />
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    'relative flex size-8 items-center justify-center rounded-full',
                    done && 'bg-success text-white',
                    current && 'animate-pulse bg-primary text-white ring-4 ring-primary/20',
                    step.state === 'pending' && 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
                  )}
                >
                  <Icon name={step.icon} size="sm" strokeWidth={2.2} />
                </span>
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    'text-sm font-medium',
                    current ? 'text-primary' : step.state === 'pending' ? 'text-muted-foreground' : undefined,
                  )}
                >
                  {step.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:bg-primary/10 sm:flex-row">
        <p className="text-center text-sm font-medium sm:text-left">
          Vous avez une urgence ou un problème technique ?
        </p>
        <Link href="/client/demande" className="w-full shrink-0 sm:w-auto">
          <Button className="w-full gap-2 sm:w-auto">
            <Icon name="plus" size="sm" />
            Lancer un dépannage
          </Button>
        </Link>
      </div>
    </div>
  );
}
