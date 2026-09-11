import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { siteConfig } from '@/lib/site-config';

export function PublicFooter() {
  return (
    <footer className="border-t border-border py-8 safe-bottom">
      <div className="mx-auto w-full max-w-lg space-y-6 px-4">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:gap-8">
          <div className="max-w-xs space-y-1">
            <p className="text-sm font-bold tracking-tight">{siteConfig.name}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              La plateforme de dépannage à domicile : décrivez votre panne, recevez un devis,
              validez et suivez votre intervention.
            </p>
            <p className="pt-1 text-xs text-muted-foreground">
              © {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.
            </p>
          </div>

          <nav aria-label="Liens RepairDom" className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              RepairDom
            </p>
            <ul className="mt-2 space-y-2">
              <li>
                <Link href="/" className="hover:underline underline-offset-4">
                  Accueil
                </Link>
              </li>
              <li>
                <Link href="/conditions-utilisation" className="hover:underline underline-offset-4">
                  Conditions d&apos;utilisation
                </Link>
              </li>
              <li>
                <Link href="/suivi" className="hover:underline underline-offset-4">
                  Suivre une intervention
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Professionnels" className="text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Professionnels
            </p>
            <ul className="mt-2 space-y-2">
              <li className="text-xs text-muted-foreground">Vous êtes professionnel ?</li>
              <li>
                <Link
                  href="/devenir-technicien"
                  className="inline-flex items-center gap-1.5 hover:underline underline-offset-4"
                >
                  <Icon name="briefcase" size="sm" />
                  Devenir technicien
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}