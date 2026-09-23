import type { MetadataRoute } from 'next';

/* PWA/manifest minimal : installation mobile avec l'identité Relio.
 * Icône provisoire = PNG officiel ; la refonte Figma fournira le jeu
 * définitif (512 masquable + mono sombre). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Relio — Dépannage à domicile, en confiance',
    short_name: 'Relio',
    description:
      'La plateforme mobile-first qui met en relation les clients et les techniciens locaux pour le dépannage et la réparation à domicile.',
    start_url: '/',
    display: 'standalone',
    lang: 'fr',
    background_color: '#0b1120',
    theme_color: '#0062cc',
    icons: [
      {
        src: '/brand/relio-logo.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
