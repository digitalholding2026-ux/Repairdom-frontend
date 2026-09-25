import { Icon } from '@/components/ui/icon';
import { Reveal } from './reveal';

const FAQ = [
  {
    question: 'Le devis est-il gratuit ?',
    answer:
      'Oui. Décrivez votre panne, le technicien vous transmet un devis clair avant toute intervention. Vous ne validez rien sans avoir accepté le prix et la date.',
  },
  {
    question: 'Comment le technicien est-il choisi ?',
    answer:
      'Seuls les techniciens disponibles, vérifiés et adaptés à votre catégorie de panne reçoivent votre demande. Vous partez toujours avec un profil concret en main.',
  },
  {
    question: 'Comment se passe le paiement ?',
    answer:
      'Le montant du devis est validé avant le début de l\u2019intervention, puis vous réglez à la fin de la mission via la plateforme. Aucune surprise après les travaux.',
  },
  {
    question: 'Que se passe-t-il si le technicien annule ?',
    answer:
      'Votre demande est automatiquement remise aux autres techniciens disponibles de votre zone. Vous êtes notifié et pouvez suivre la mise en relation en direct.',
  },
];

export function Faq() {
  return (
    <section className="mt-14" aria-labelledby="faq-title">
      <Reveal>
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-primary">
          Questions fréquentes
        </p>
        <h2 id="faq-title" className="mt-1 px-1 text-xl font-bold tracking-tight sm:text-2xl">
          On répond à vos questions
        </h2>
      </Reveal>
      <div className="mx-auto mt-6 max-w-4xl space-y-2.5">
        {FAQ.map((item, index) => (
          <Reveal key={item.question} delay={index * 60}>
            <details className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-colors open:border-primary/30">
              <summary className="flex list-none cursor-pointer items-center justify-between gap-3 p-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-transform duration-300 group-open:rotate-180 dark:bg-white/10 dark:text-slate-200">
                  <Icon name="chevron-down" size="sm" />
                </span>
              </summary>
              <div className="border-t border-border/60 px-4 pb-4 pt-3 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </div>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
