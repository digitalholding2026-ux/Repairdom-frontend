import { Icon } from '@/components/ui/icon';

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
    <section id="faq" className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 pt-6" aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-center text-lg font-extrabold tracking-tight text-slate-900">
        Questions fréquentes
      </h2>
      <div className="mt-3 space-y-2">
        {FAQ.map((item) => (
          <details key={item.question} className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-colors open:border-orange-300">
            <summary className="flex list-none cursor-pointer items-center justify-between gap-3 p-3.5 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
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
