import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ClientAuthForm } from '@/components/client/client-auth-form';

export const metadata: Metadata = {
  title: 'Se connecter',
};

export default function ConnexionPage() {
  return (
    <div className="space-y-4">
      <AuthCard
        icon="home"
        title="Se connecter"
        description="Reprenez le suivi de vos demandes de dépannage."
      >
        <ClientAuthForm mode="signin" />
      </AuthCard>

      <p className="text-center text-sm text-muted-foreground">
        Nouveau sur RepairDom ?{' '}
        <Link href="/client/inscription" className="font-medium text-primary underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}