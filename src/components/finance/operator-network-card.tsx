'use client';

import Image from 'next/image';
import { cn } from '@/lib/cn';

export type OperatorCode = 'mtn' | 'orange';

export interface OperatorNetwork {
  code: OperatorCode;
  title: string;
  subtitle: string;
  logoSrc: string;
  logoAlt: string;
}

/* Réseaux Mobile Money (logos officiels servis depuis `/operators`).
 * MTN MoMo : logo sur fond jaune ; Orange Money : logo sur fond noir/orange.
 * Le conteneur fixe + `object-contain` évitent tout étirement ou
 * débordement, quelle que soit la taille source du logo. */
export const OPERATOR_NETWORKS: OperatorNetwork[] = [
  {
    code: 'mtn',
    title: 'MTN MoMo',
    subtitle: 'Push USSD direct',
    logoSrc: '/operators/mtn.jpg',
    logoAlt: 'MTN MoMo',
  },
  {
    code: 'orange',
    title: 'Orange Money',
    subtitle: 'Validation Mobile / Web',
    logoSrc: '/operators/orange.jpg',
    logoAlt: 'Orange Money',
  },
];

/* Carte réseau sélectionnable : logo dimensionné, libellé tronqué sans
 * chevauchement, pastille de sélection sur l'option active. Variante
 * `compact` : empilée pleine largeur dans les bottom-sheets (logo réduit,
 * espacements resserrés). */
export function OperatorNetworkCard({
  network,
  selected,
  onSelect,
  compact = false,
  dense = false,
}: {
  network: OperatorNetwork;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
  /** Densité maximale : grille 2 colonnes en bottom-sheet (logos w-6,
   *  textes 11/9px). */
  dense?: boolean;
}) {
  const amber = network.code === 'mtn';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center text-left transition-all',
        dense
          ? 'gap-2 rounded-lg border-2 p-1.5'
          : compact
            ? 'gap-2.5 rounded-xl border-2 p-2'
            : 'gap-3 rounded-2xl border-2 p-3.5',
        selected
          ? amber
            ? 'border-amber-400 bg-amber-500/10 shadow-sm'
            : 'border-orange-500/60 bg-orange-500/10 shadow-sm ring-2 ring-orange-500/20'
          : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900',
      )}
    >
      <span
        className={cn(
          'relative flex flex-shrink-0 items-center justify-center overflow-hidden border p-0.5',
          dense ? 'h-6 w-6 rounded-md' : compact ? 'h-8 w-8 rounded-lg' : 'h-12 w-12 rounded-xl p-1',
          amber
            ? 'border-amber-200/50 bg-amber-400/20'
            : network.code === 'orange' && (compact || dense)
              ? 'border-slate-700 bg-slate-900'
              : 'border-orange-200/50 bg-orange-500/10',
        )}
      >
        <Image
          src={network.logoSrc}
          alt={network.logoAlt}
          width={48}
          height={48}
          className="h-full w-full rounded-md object-contain object-center"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate font-bold text-slate-900 dark:text-white', dense ? 'text-[11px] leading-tight' : 'text-xs')}>
          {network.title}
        </span>
        <span className={cn('block truncate text-slate-500', dense ? 'text-[9px]' : 'text-[10px]')}>{network.subtitle}</span>
      </span>
      {selected ? (
        <span
          aria-hidden
          className={cn(
            'flex flex-shrink-0 items-center justify-center rounded-full font-bold text-white',
            dense ? 'h-5 w-5 text-[10px]' : compact ? 'h-5 w-5 text-[10px]' : 'h-6 w-6 text-xs',
            amber ? 'bg-amber-500' : 'bg-orange-500/90',
          )}
        >
          ✓
        </span>
      ) : null}
    </button>
  );
}
