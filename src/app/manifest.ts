import type { MetadataRoute } from 'next';

/* PWA/manifest minimal : installation mobile avec l'identité Relio. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Relio — Dépannage à domicile, en confiance',
    short_name: 'Relio',
    description:
      'La plateforme mobile-first qui met en relation les clients et les techniciens locaux pour le dépannage et la réparation à domicile.',
    start_url: '/',
    display: 'standalone',
    lang: 'fr',
    background_color: '#0B0D12',
    theme_color: '#F97316',
    icons: [
      {
        src: '/brand/relio-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
