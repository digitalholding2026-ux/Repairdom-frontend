import type { Metadata } from 'next';
import Link from 'next/link';
import { TechnicianAuthForm } from '@/components/technician/technician-auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Connexion technicien',
};

export default function TechnicianConnexionPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Se connecter</CardTitle>
          <CardDescription>
            Accédez à vos demandes de dépannage et gérez vos interventions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TechnicianAuthForm mode="signin" />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link href="/technicien/inscription" className="font-medium text-primary underline-offset-4 hover:underline">
          Créer un compte technicien
        </Link>
      </p>
    </div>
  );
}