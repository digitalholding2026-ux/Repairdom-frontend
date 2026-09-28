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
 * chevauchement, pastille de sélection sur l'option active. */
export function OperatorNetworkCard({
  network,
  selected,
  onSelect,
}: {
  network: OperatorNetwork;
  selected: boolean;
  onSelect: () => void;
}) {
  const amber = network.code === 'mtn';
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all',
        selected
          ? amber
            ? 'border-amber-400 bg-amber-500/5 shadow-sm ring-2 ring-amber-400/20'
            : 'border-orange-500/60 bg-orange-500/10 shadow-sm ring-2 ring-orange-500/20'
          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900',
      )}
    >
      <span
        className={cn(
          'relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border p-1',
          amber
            ? 'border-amber-200/50 bg-amber-400/10'
            : 'border-orange-200/50 bg-orange-500/10',
        )}
      >
        <Image
          src={network.logoSrc}
          alt={network.logoAlt}
          width={48}
          height={48}
          className="h-full w-full rounded-lg object-contain object-center"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
          {network.title}
        </span>
        <span className="block truncate text-xs text-slate-500">{network.subtitle}</span>
      </span>
      {selected ? (
        <span
          aria-hidden
          className={cn(
            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
            amber ? 'bg-amber-500' : 'bg-orange-500/90',
          )}
        >
          ✓
        </span>
      ) : null}
    </button>
  );
}
