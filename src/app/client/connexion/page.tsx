import type { Metadata } from 'next';
import Link from 'next/link';
import { ClientAuthForm } from '@/components/client/client-auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Se connecter',
};

export default function ConnexionPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Se connecter</CardTitle>
          <CardDescription>
            Reprenez le suivi de vos demandes de dépannage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientAuthForm mode="signin" />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Nouveau sur RepairDom ?{' '}
        <Link href="/client/inscription" className="font-medium text-primary underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}