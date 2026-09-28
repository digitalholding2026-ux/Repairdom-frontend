import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';

/* Témoignages en carrousel horizontal (snap) : cartes compactes w-72,
 * défilement natif sans fatigue de scroll vertical. */

const TESTIMONIALS = [
  {
    firstName: 'Awa',
    lastName: 'N.',
    city: 'Douala',
    quote:
      'Panne de lave-linge le dimanche : devis reçu en 30 minutes, technicien ponctuel et tarif respecté.',
    rating: 5,
  },
  {
    firstName: 'Marc',
    lastName: 'K.',
    city: 'Yaoundé',
    quote:
      'Enfin une plateforme où on sait combien on paiera avant l\u2019intervention. Le suivi en direct est top.',
    rating: 5,
  },
  {
    firstName: 'Salomé',
    lastName: 'D.',
    city: 'Kribi',
    quote:
      'Technicien disponible le jour même. Propre, poli, et l\u2019évaluation des deux côtés rassure.',
    rating: 4,
  },
];

export function Testimonials() {
  return (
    <section aria-labelledby="testimonials-title" className="mx-auto w-full max-w-3xl px-4 pt-6">
      <h2 id="testimonials-title" className="text-center text-lg font-extrabold tracking-tight text-slate-900">
        Ils nous font confiance
      </h2>
      <div className="no-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {TESTIMONIALS.map((item) => (
          <figure
            key={item.firstName}
            className="w-72 flex-shrink-0 snap-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
          >
            <span className="flex items-center gap-0.5 text-amber-400" aria-label={`${item.rating}/5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon key={i} name="star" size="3.5" filled={i < item.rating} />
              ))}
            </span>
            <blockquote className="mt-2 text-xs leading-relaxed text-slate-700">
              « {item.quote} »
            </blockquote>
            <figcaption className="mt-3 flex items-center gap-2">
              <Avatar firstName={item.firstName} lastName={item.lastName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-900">
                  {item.firstName} {item.lastName}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Icon name="pin" size="3.5" />
                  {item.city}
                </p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
