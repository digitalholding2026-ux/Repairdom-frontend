import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { TechnicianAuthForm } from '@/components/technician/technician-auth-form';

export const metadata: Metadata = {
  title: 'Connexion technicien',
};

export default function TechnicianConnexionPage() {
  return (
    <div className="space-y-4">
      <AuthCard
        icon="briefcase"
        title="Se connecter"
        description="Accédez à vos demandes de dépannage et gérez vos interventions."
      >
        <TechnicianAuthForm mode="signin" />
      </AuthCard>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link href="/technicien/inscription" className="font-medium text-primary underline-offset-4 hover:underline">
          Créer un compte technicien
        </Link>
      </p>
    </div>
  );
}