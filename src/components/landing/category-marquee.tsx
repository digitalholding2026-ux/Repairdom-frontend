import Link from 'next/link';
import { Icon, type IconName } from '@/components/ui/icon';
import { Marquee } from './marquee';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';

const CATEGORY_ICONS: Record<string, IconName> = {
  electricite: 'zap',
  plomberie: 'droplet',
  climatisation: 'thermometer',
  electromenager: 'settings',
  serrurerie: 'shield-check',
  informatique: 'cpu',
  autre: 'plus',
};

export function CategoryMarquee() {
  const chips = REQUEST_CATEGORIES.map((category) => (
    <Link
      key={category.id}
      href="/client/inscription"
      className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-card transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon name={CATEGORY_ICONS[category.id] ?? 'sparkles'} size="3.5" />
      </span>
      {category.label}
    </Link>
  ));

  return (
    <section className="mt-14" aria-labelledby="categories-title">
      <p id="categories-title" className="px-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Besoin d&apos;un pro pour quoi que ce soit
      </p>
      <h2 className="mt-1.5 px-1 text-center text-xl font-bold tracking-tight sm:text-2xl">
        Explorez par catégorie
      </h2>
      <div className="relative mt-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent"
        />
        <Marquee items={chips} duration={26} />
      </div>
    </section>
  );
}