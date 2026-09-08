import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Espace client',
};

export default function ClientHomePage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-3 text-center">
        <Badge variant="success">Dépanner en 5 minutes</Badge>
        <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
          Déposez votre demande de dépannage
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Décrivez votre panne et indiquez le lieu d’intervention. Nous trouvons le technicien
          adapté près de chez vous.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Commencez votre parcours</CardTitle>
          <CardDescription>Créez votre compte client pour déposer une demande.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/client/inscription" className="block">
            <Button className="w-full">Créer un compte</Button>
          </Link>
          <Link href="/client/connexion" className="block">
            <Button variant="secondary" className="w-full">
              Je suis déjà client
            </Button>
          </Link>
          <div className="flex items-center gap-3 py-1" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <Link
            href="/client/demande"
            className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Commencer une demande sans compte
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}