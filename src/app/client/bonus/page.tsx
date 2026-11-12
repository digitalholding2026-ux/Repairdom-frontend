import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

export default function BonusPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Programme de fidélité B2B"
        description="Gagnez des points à chaque parrainage et échangez-les contre des récompenses."
        backHref="/client"
      />

      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
              <Icon name="badge-check" size="xl" />
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Bientôt disponible
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Gagnez des points à chaque parrainage de client et échangez-les
            contre des récompenses exclusives. Le programme de fidélité B2B
            sera lancé prochainement.
          </p>
          <Button variant="outline">
            <a href="/client/profil" className="flex items-center justify-center w-full">
              Retour à mon profil
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
