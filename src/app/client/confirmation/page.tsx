import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRequestedTiming } from '@/lib/request-timing';

export const metadata: Metadata = {
  title: 'Demande envoyée',
};

interface ConfirmationPageProps {
  searchParams: Promise<{ ref?: string | string[]; id?: string | string[]; mode?: string | string[]; req?: string | string[] }>;
}

export default async function ConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const { ref, id, mode, req } = await searchParams;
  const requestId = Array.isArray(ref) ? ref[0] : ref;
  const demandeId = Array.isArray(id) ? id[0] : id;
  const requestedMode = String(Array.isArray(mode) ? mode[0] : mode ?? 'ASAP');
  const requestedAt = Array.isArray(req) ? req[0] : req ?? null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-center gap-3 text-center">
        <Badge variant="success">Demande envoyée</Badge>
        <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
          Votre demande a bien été envoyée
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Nous recherchons un technicien adapté à votre panne. Vous recevrez une confirmation
          lorsqu’un professionnel aura accepté la mission.
        </p>
        <p className="text-sm font-medium">
          {requestedMode === 'SCHEDULED' ? 'Intervention souhaitée' : 'Intervention'} :{' '}
          {formatRequestedTiming(requestedMode, requestedAt)}
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Numéro de suivi</CardTitle>
          <CardDescription>Conservez ce numéro pour toute communication.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border bg-muted/50 px-4 py-4 text-center">
            <span className="font-mono text-lg font-semibold tracking-wide text-primary">
              {requestId ?? '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Et maintenant ?</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Un technicien certifié consulte votre demande.</li>
          <li>Vous recevez un premier retour avec un délai d’intervention.</li>
          <li>Vous validez le rendez-vous et le devis avant toute intervention.</li>
        </ol>
      </section>

      <div className="flex flex-col gap-3">
        {demandeId ? (
          <Link href={`/client/demandes/${demandeId}`} className="block">
            <Button className="w-full">Suivre ma demande</Button>
          </Link>
        ) : null}
        <Link href="/client/demande" className="block">
          <Button className="w-full">Déposer une nouvelle demande</Button>
        </Link>
        <Link href="/" className="block">
          <Button variant="secondary" className="w-full">
            Retour à l&apos;accueil
          </Button>
        </Link>
      </div>
    </div>
  );
}