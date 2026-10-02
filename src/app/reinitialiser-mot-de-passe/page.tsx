import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { BrandLogo } from '@/components/public/brand-logo';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Spinner } from '@/components/ui/spinner';

export const metadata: Metadata = {
  title: 'Réinitialiser le mot de passe',
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 py-10">
      <div className="flex justify-center pt-2">
        <BrandLogo href="/" />
      </div>
      <AuthCard
        icon="home"
        title="Réinitialiser le mot de passe"
        description="Choisissez un nouveau mot de passe pour votre compte Relio."
      >
        <Suspense fallback={<Spinner />}>
          <ResetPasswordForm />
        </Suspense>
      </AuthCard>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/mot-de-passe-oublie" className="font-medium text-primary underline-offset-4 hover:underline">
          Demander un nouveau lien
        </Link>
      </p>
    </div>
  );
}
