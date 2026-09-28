/* Hero « Tech Grid & Light Sweep » : fond 100 % vectoriel (0 image),
 * grille tech subtile + halos lumineux animés (transform/opacité
 * uniquement, 60 FPS mobile). Conteneur non interactif, contenu hero
 * par-dessus en z-10. */

export function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">
      {/* 1. Orbes de lumière animés (Glow Sweep) */}
      <div className="animate-glow-sweep absolute -top-20 left-1/2 h-[300px] w-[350px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-orange-500/20 via-amber-400/15 to-orange-400/5 blur-3xl sm:h-[400px] sm:w-[600px]" />
      <div className="animate-breathe absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-orange-400/10 blur-3xl" />

      {/* 2. Motif de grille vectorielle tech */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* 3. Ligne de faisceau lumineux horizontal */}
      <div className="absolute top-0 right-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
    </div>
  );
}
