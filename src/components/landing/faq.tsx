import { Icon } from '@/components/ui/icon';

/* FAQ — réponses vérifiables dans le code applicatif.
 * ⚠️ Aucun délai/SLA n'est annoncé : le créneau est confirmé par le
 * technicien après acceptation du devis. */
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
      'Le montant du devis est validé avant le début de l’intervention, puis vous réglez une fois l’intervention terminée et validée. Aucune surprise après les travaux.',
  },
  {
    question: 'Que se passe-t-il si le technicien annule ?',
    answer:
      'Votre demande est automatiquement remise aux autres techniciens disponibles de votre zone. Vous êtes notifié et pouvez suivre la mise en relation en direct.',
  },
  {
    question: 'Dans quelles zones intervenez-vous ?',
    answer:
      'Nous couvrons les villes et zones listées dans le formulaire de demande. Les zones disponibles dépendent de votre ville : le champ se met à jour automatiquement.',
  },
  {
    question: 'Puis-je suivre mon intervention ?',
    answer:
      'Oui. Dès qu’un technicien accepte votre demande, vous recevez une référence de suivi (format RD-XXXXXX). Vous pouvez la saisir à tout moment pour connaître l’avancement.',
  },
  {
    question: 'Que gagne-t-il un client fidèle ?',
    answer:
      'Vos interventions confirmées sont comptabilisées. Dès le 5ᵉ dépannage, votre prochaine intervention vous est offerte, et des paliers plus généreux vous attendent jusqu’au smartphone.',
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 py-6" aria-labelledby="faq-title">
      <div className="text-center">
        <h2 id="faq-title" className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
          Questions fréquentes
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Les réponses aux questions qu’on nous pose le plus souvent.
        </p>
      </div>
      <div className="mt-4 space-y-2">
        {FAQ.map((item) => (
          <details
            key={item.question}
            className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-colors open:border-orange-300"
          >
            <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 p-3.5 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
              {item.question}
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform duration-300 group-open:rotate-180">
                <Icon name="chevron-down" size="3.5" />
              </span>
            </summary>
            <div className="border-t border-slate-100 px-3.5 pb-3.5 pt-2.5 text-xs leading-relaxed text-slate-600">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}