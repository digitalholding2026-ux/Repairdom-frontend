import Image from 'next/image';
import { Icon } from '@/components/ui/icon';
import { HeroActions } from './hero-actions';

function TrustBadges({ className = '' }: { className?: string }) {
  return (
    <p className={`inline-flex flex-wrap items-center gap-2 text-sm text-white/80 ${className}`}>
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
  );
}

/* Hero fully responsive + full-width (100vw, fond uni #0B0D12 sans motif) :
 * - Desktop (lg+) : bannière 100% largeur en fill/object-cover, boutons
 *   translucides en overlay absolu bas-gauche (ni texte ni visage masqués).
 * - Mobile/Tablette (< lg) : carte image non déformée aspect-[4/3] puis
 *   aspect-[16/10] en sm, boutons en flux sous l'image (flex-col -> sm:row).
 * SEO/a11y : h1 + description en sr-only (l'affiche contient déjà le texte). */
export function Hero() {
  return (
    <section className="w-full relative bg-[#0B0D12] overflow-hidden px-0">
      <h1 className="sr-only">Votre panne, notre priorité.</h1>
      <p className="sr-only">
        Déposez votre demande, trouvez un technicien qualifié près de chez vous et obtenez une
        intervention rapide.
      </p>

      {/* ── Desktop (lg+) : bannière full-width 100% fill/object-cover ── */}
      <div className="relative hidden w-full min-h-[80vh] overflow-hidden lg:flex lg:items-center lg:justify-center">
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="/hero/hero_main.png"
            alt="Affiche Relio : Votre panne, notre priorité — déposez votre panne, technicien qualifié, diagnostic avec devis et intervention rapide"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center w-full h-full"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
          />
        </div>

        {/* Overlay bas-gauche : ne cache ni "priorité." ni le visage */}
        <div className="absolute bottom-8 left-8 lg:left-16 z-10 flex flex-row items-center gap-4">
          <HeroActions />
        </div>

        {/* Reassurance bas-droite desktop */}
        <div className="absolute bottom-8 right-8 xl:right-16 z-10 hidden xl:flex">
          <TrustBadges />
        </div>
      </div>

      {/* ── Mobile & Tablette (< lg) : image non tronquée + boutons en flux ── */}
      <div className="w-full px-4 pt-6 pb-8 sm:px-6 lg:hidden">
        <div className="relative w-full h-auto aspect-[4/3] sm:aspect-[16/10] overflow-hidden rounded-xl border border-white/10 shadow-2xl">
          <Image
            src="/hero/hero_main.png"
            alt="Affiche Relio : Votre panne, notre priorité — déposez votre panne, technicien qualifié, diagnostic avec devis et intervention rapide"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center w-full h-full"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
          />
        </div>

        {/* Boutons : colonne sur mobile, ligne dès sm, centrés, sous l'image */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 px-0 w-full justify-center items-stretch sm:items-center">
          <HeroActions />
        </div>

        {/* Reassurance centrée sur mobile */}
        <div className="mt-4 flex w-full justify-center text-center">
          <TrustBadges className="justify-center text-center" />
        </div>
      </div>
    </section>
  );
}
