import { PublicHeader } from '@/components/public/public-header';
import { PublicFooter } from '@/components/public/public-footer';
import { Hero } from '@/components/landing/hero';
import { CompactCta, HowItWorks, ServicesGrid, WhyRelio } from '@/components/landing/landing-sections';
import { Testimonials } from '@/components/landing/testimonials';
import { Faq } from '@/components/landing/faq';

/* Landing ultra-compacte (zero-scroll-fatigue) : hero resserré, briques
 * de services 3 colonnes, pourquoi 2x2, 3 étapes horizontales, avis en
 * carrousel snap, FAQ en accordéons rétractés, bannière finale épurée. */
export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <PublicHeader />

      <main className="flex-1 overflow-x-clip">
        <Hero />
        <ServicesGrid />
        <WhyRelio />
        <HowItWorks />
        <Testimonials />
        <Faq />
        <CompactCta />
      </main>

      <PublicFooter />
    </div>
  );
}
