import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { BrandLogo } from '@/components/public/brand-logo';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 py-10">
      <div className="flex justify-center pt-2">
        <BrandLogo href="/" />
      </div>
      <AuthCard
        icon="home"
        title="Mot de passe oublié ?"
        description="Entrez votre e-mail, nous vous enverrons un lien de réinitialisation."
      >
        <ForgotPasswordForm />
      </AuthCard>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/client/connexion" className="font-medium text-primary underline-offset-4 hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
