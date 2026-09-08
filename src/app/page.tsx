import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { siteConfig } from '@/lib/site-config';
import Link from 'next/link';

const features = [
  {
    title: 'Clients',
    description:
      'Décrivez votre panne par texte, audio, photo ou vidéo et trouvez un technicien proche et compétent.',
  },
  {
    title: 'Techniciens',
    description:
      'Gérez vos compétences, vos zones d’intervention, vos devis et le suivi de vos missions.',
  },
  {
    title: 'Confiants',
    description:
      'Devis clairs, rendez-vous planifiés, facturation simple et évaluations pour chaque intervention.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur safe-top">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <span className="text-base font-semibold tracking-tight">{siteConfig.name}</span>
          <nav className="flex items-center gap-2">
            <Badge variant="info">Bientôt disponible</Badge>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
        <section className="flex flex-col items-center gap-4 text-center">
          <Badge variant="success">MVP en préparation</Badge>
          <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Le dépannage à domicile, simple et de confiance
          </h1>
          <p className="max-w-md text-base text-muted-foreground">
            {siteConfig.description}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/client">
              <Button size="lg">Devenir client</Button>
            </Link>
            <Link href="/technicien/inscription">
              <Button size="lg" variant="secondary">
                Devenir technicien
              </Button>
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="Fonctionnalités à venir">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground safe-bottom">
        <p>© {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.</p>
      </footer>
    </div>
  );
}