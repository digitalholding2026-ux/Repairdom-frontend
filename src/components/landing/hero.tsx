import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import { HeroActions } from './hero-actions';

/* Hero immersif pleine largeur navigateur (full-width bleed 100vw) :
 * l'affiche marketing `/hero/hero_main.png` couvre tout l'écran
 * (object-cover, sans max-width ni bandes latérales). Aucun texte HTML en
 * doublon : h1 + description en `sr-only` (SEO/a11y). Boutons translucides
 * (glassmorphism) repositionnés en bas-gauche pour ne pas masquer le texte
 * ni le visage. */
export function Hero() {
  return (
    <>
      <section className="w-full relative min-h-[80vh] flex items-center justify-center bg-[#0B0D12] overflow-hidden">
      <h1 className="sr-only">Votre panne, notre priorité.</h1>
      <p className="sr-only">
        Déposez votre demande, trouvez un technicien qualifié près de chez vous et obtenez une
        intervention rapide.
      </p>

      {/* Bannière pleine largeur navigateur : de l'extrême gauche à l'extrême droite, sans bandes latérales */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/hero/hero_main.png"
          alt="Affiche Relio : Votre panne, notre priorité — déposez votre panne, technicien qualifié, diagnostic avec devis et intervention rapide"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center w-full h-full"
        />
        {/* Voile bas pour lisibilité des boutons translucides */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
        />
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F97316]/10 blur-[120px]"
      />

      {/* Bloc d'actions repositionné bas-gauche pour ne plus masquer le texte ni le visage */}
      <div className="absolute bottom-8 left-6 md:left-16 lg:left-24 z-10 flex flex-wrap items-center gap-4 max-w-[calc(100vw-3rem)]">
        <HeroActions />
      </div>

      {/* Preuves sociales : bas-droite sur desktop, sous la bannière sur mobile */}
      <div className="absolute bottom-8 right-6 md:right-16 z-10 hidden lg:flex">
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
      </div>

      {/* Preuves sociales mobile : sous la bannière pour ne pas chevaucher l'image */}
      </section>
      <div className="w-full bg-[#0B0D12] px-6 py-3 lg:hidden">
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
      </div>
    </>
  );
}
