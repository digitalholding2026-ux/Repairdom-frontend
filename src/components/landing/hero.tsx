import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import { HeroActions } from './hero-actions';

/* Hero immersif plein format : l'affiche marketing `/hero/hero_main.png`
 * (1536×1024, ratio 3:2 exact) contient déjà le titre, les badges et les
 * visuels — elle s'affiche EN ENTIER sans rognage (conteneur aspect-[3/2]
 * + object-cover aux proportions identiques = zéro coupe). Aucun texte
 * HTML en doublon : le h1 et la description restent accessibles aux
 * lecteurs d'écran et au SEO en `sr-only`. Les boutons HTML réels
 * (HeroActions) sont rendus sous la bannière, hors de l'image. */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0B0D12]">
      <h1 className="sr-only">Votre panne, notre priorité.</h1>
      <p className="sr-only">
        Déposez votre demande, trouvez un technicien qualifié près de chez vous et obtenez une
        intervention rapide.
      </p>

      <div aria-hidden className="animate-float absolute -right-20 -top-24 size-72 rounded-full bg-[#F97316]/20 blur-3xl" />
      <div
        aria-hidden
        className="animate-float absolute -bottom-36 -left-24 size-80 rounded-full bg-[#FB923C]/10 blur-3xl [animation-delay:3s]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pb-16 lg:pt-12">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          <Image
            src="/hero/hero_main.png"
            alt="Affiche Relio : Votre panne, notre priorité — déposez votre panne, technicien qualifié, diagnostic avec devis et intervention rapide"
            fill
            priority
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover object-center"
          />
        </div>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="inline-flex flex-wrap items-center gap-2 text-sm text-white/80">
            <span className="flex items-center gap-0.5 text-amber-300">
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon key={i} name="star" size="3.5" filled />
              ))}
            </span>
            <span className="font-medium text-white">4,9/5</span>
            <span aria-hidden className="size-0.5 rounded-full bg-white/60" />
            <span>5000+ interventions réalisées</span>
            <span aria-hidden className="size-0.5 rounded-full bg-white/60" />
            <span>350+ techniciens vérifiés</span>
          </p>
          <div className="w-full lg:w-auto lg:min-w-[22rem]">
            <HeroActions />
          </div>
        </div>
      </div>
    </section>
  );
}
