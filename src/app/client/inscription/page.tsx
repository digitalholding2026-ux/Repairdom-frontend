import type { Metadata } from 'next';
import Link from 'next/link';
import { ClientAuthForm } from '@/components/client/client-auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Créer un compte',
};

export default function InscriptionPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Créer un compte client</CardTitle>
          <CardDescription>
            Remplissez le formulaire pour déposer vos demandes de dépannage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientAuthForm mode="signup" />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Déjà client ?{' '}
        <Link href="/client/connexion" className="font-medium text-primary underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}