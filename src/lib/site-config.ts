export const siteConfig = {
  name: 'RepairDom',
  description:
    "La plateforme mobile-first qui met en relation les clients et les techniciens locaux pour le dépannage et la réparation à domicile.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
} as const;

export type SiteConfig = typeof siteConfig;