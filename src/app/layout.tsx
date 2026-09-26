import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Toaster } from '@/components/ui/toast';
import { ToastProvider } from '@/lib/toast-context';
import { siteConfig } from '@/lib/site-config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  /* Base de résolution des images OG/Twitter (prod via NEXT_PUBLIC_APP_URL). */
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Relio — Dépannage à domicile, en confiance',
    template: '%s · Relio',
  },
  description:
    "La plateforme mobile-first qui met en relation les clients et les techniciens locaux pour le dépannage et la réparation à domicile.",
  applicationName: 'Relio',
  /* Identité : favicon pin orange (app/icon.svg + brand/relio-mark.svg), net à toutes les tailles. */
  icons: {
    icon: [{ url: '/brand/relio-mark.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/brand/relio-mark.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    siteName: 'Relio',
    title: 'Relio — Dépannage à domicile, en confiance',
    description:
      "La plateforme mobile-first qui met en relation les clients et les techniciens locaux pour le dépannage et la réparation à domicile.",
    images: [{ url: '/brand/relio-logo-light.svg', alt: 'Relio' }],
  },
  twitter: {
    card: 'summary',
    title: 'Relio — Dépannage à domicile, en confiance',
    description:
      "La plateforme mobile-first qui met en relation les clients et les techniciens locaux pour le dépannage et la réparation à domicile.",
    images: ['/brand/relio-logo-light.svg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F97316',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh overflow-x-clip font-sans antialiased">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}