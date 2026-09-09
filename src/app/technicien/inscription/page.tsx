import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { TechnicianAuthForm } from '@/components/technician/technician-auth-form';

export const metadata: Metadata = {
  title: 'Créer un compte technicien',
};

export default function TechnicianInscriptionPage() {
  return (
    <div className="space-y-4">
      <AuthCard
        icon="users"
        title="Créer un compte technicien"
        description="Inscrivez-vous pour intervenir sur les demandes de dépannage près de chez vous."
      >
        <TechnicianAuthForm mode="signup" />
      </AuthCard>

      <p className="text-center text-sm text-muted-foreground">
        Déjà technicien ?{' '}
        <Link href="/technicien/connexion" className="font-medium text-primary underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}