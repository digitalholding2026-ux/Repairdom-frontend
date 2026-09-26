import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Reveal } from './reveal';

const TESTIMONIALS = [
  {
    firstName: 'Awa',
    lastName: 'N.',
    city: 'Douala',
    quote:
      'Panne de lave-linge le dimanche : devis reçu en 30 minutes, technicien ponctuel et tarif respecté. Merci !',
    rating: 5,
  },
  {
    firstName: 'Marc',
    lastName: 'K.',
    city: 'Yaoundé',
    quote:
      'Enfin une plateforme où on sait combien on paiera avant l\u2019intervention. Le suivi en direct évite les attentes inutiles.',
    rating: 5,
  },
  {
    firstName: 'Salomé',
    lastName: 'D.',
    city: 'Kribi',
    quote:
      'Le technicien était disponible le jour même. Propre, poli, et l\u2019évaluation des deux côtés rassure vraiment.',
    rating: 4,
  },
];

export function Testimonials() {
  return (
    <section className="mt-14" aria-labelledby="testimonials-title">
      <Reveal>
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-primary">
          Ils nous font confiance
        </p>
        <h2 id="testimonials-title" className="mt-1 px-1 text-xl font-bold tracking-tight sm:text-2xl">
          Des clients satisfaits, à chaque intervention
        </h2>
      </Reveal>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {TESTIMONIALS.map((item, index) => (
          <Reveal key={item.firstName} delay={index * 80} className="h-full">
            <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/30">
              <span className="flex items-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Icon key={i} name="star" size="sm" filled={i < item.rating} />
                ))}
              </span>
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
                « {item.quote} »
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-2.5">
                <Avatar firstName={item.firstName} lastName={item.lastName} size="sm" />
                <div>
                  <p className="text-sm font-semibold leading-none">
                    {item.firstName} {item.lastName}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Icon name="pin" size="3.5" />
                    {item.city}
                  </p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}