import type { Metadata } from 'next';
import Link from 'next/link';
import { TechnicianAuthForm } from '@/components/technician/technician-auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Créer un compte technicien',
};

export default function TechnicianInscriptionPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Créer un compte technicien</CardTitle>
          <CardDescription>
            Inscrivez-vous pour intervenir sur les demandes de dépannage près de chez vous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TechnicianAuthForm mode="signup" />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Déjà technicien ?{' '}
        <Link href="/technicien/connexion" className="font-medium text-primary underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}