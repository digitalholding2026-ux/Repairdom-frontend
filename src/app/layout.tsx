import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Toaster } from '@/components/ui/toast';
import { ToastProvider } from '@/lib/toast-context';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Relio — Dépannage à domicile, en confiance',
    template: '%s · Relio',
  },
  description:
    "La plateforme mobile-first qui met en relation les clients et les techniciens locaux pour le dépannage et la réparation à domicile.",
  applicationName: 'Relio',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#007bff',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}