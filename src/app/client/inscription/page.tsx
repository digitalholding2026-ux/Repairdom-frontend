import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ClientAuthForm } from '@/components/client/client-auth-form';

export const metadata: Metadata = {
  title: 'Créer un compte',
};

export default function InscriptionPage() {
  return (
    <div className="space-y-4">
      <AuthCard
        icon="wrench"
        title="Créer un compte client"
        description="Remplissez le formulaire pour déposer vos demandes de dépannage."
      >
        <ClientAuthForm mode="signup" />
      </AuthCard>

      <p className="text-center text-sm text-muted-foreground">
        Déjà client ?{' '}
        <Link href="/client/connexion" className="font-medium text-primary underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}