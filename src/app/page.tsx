import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { Hero } from '@/components/landing/hero';
import {
  BecomeTechnician,
  CompactCta,
  HowItWorks,
  Rewards,
  ServicesGrid,
  WhyRelio,
} from '@/components/landing/landing-sections';
import { TrustStats } from '@/components/landing/trust-stats';
import { Faq } from '@/components/landing/faq';

/* Landing — ordre des blocs imposé par la DC :
 * 1. Hero → 2. Comment ça marche → 3. Réassurance → 4. Services
 * → 5. Preuves sociales → 6. FAQ → 7. Récompenses
 * → 8. Devenir technicien → 9. CTA final.
 *
 * ⚠️ Le bloc « Preuves sociales » s'auto-masque si `GET /cities` échoue
 * (cf. trust-stats.tsx) : aucun chiffre inventé n'est jamais affiché.
 * Le bloc témoignages a été SUPPRIMÉ (faux avis). */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <PublicHeader />

      <main className="flex-1 overflow-x-clip">
        {/* 1 */}
        <Hero />
        {/* 2 */}
        <HowItWorks />
        {/* 3 */}
        <WhyRelio />
        {/* 4 */}
        <ServicesGrid />
        {/* 5 — masqué si aucune donnée réelle */}
        <TrustStats />
        {/* 6 */}
        <Faq />
        {/* 7 */}
        <Rewards />
        {/* 8 */}
        <BecomeTechnician />
        {/* 9 */}
        <CompactCta />
      </main>

      <PublicFooter />
    </div>
  );
}