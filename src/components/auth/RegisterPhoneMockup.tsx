import { BrandLogo } from '@/components/public/brand-logo';
import { Icon, type IconName } from '@/components/ui/icon';

const GUARANTEES: Array<{ icon: IconName; title: string; text: string }> = [
  { icon: 'zap', title: 'Devis transparent', text: 'Prix validé avant chaque intervention.' },
  { icon: 'shield-check', title: 'Techniciens vérifiés', text: 'Profils contrôlés et qualifiés.' },
  { icon: 'wallet', title: 'Paiement sécurisé', text: 'Mobile Money & carte bancaire.' },
];

/* Mockup de smartphone flottant (colonne gauche de l'inscription) :
 * cadre téléphone réaliste avec Dynamic Island, garanties en style
 * notifications translucides et widget de note en bas d'écran. */
export function RegisterPhoneMockup() {
  return (
    <div className="flex w-full items-center justify-center py-2">
      <div className="relative mx-auto w-[280px] sm:w-[320px] h-[580px] bg-slate-900 border-[6px] border-slate-800 rounded-[40px] shadow-2xl shadow-orange-500/10 overflow-hidden transform -rotate-1 hover:rotate-0 transition-transform duration-500">
        {/* Dynamic Island */}
        <div aria-hidden className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-800 rounded-full z-20" />

        {/* Écran */}
        <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-black p-6 flex flex-col justify-between text-white h-full pt-10 relative">
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-orange-500/20 blur-3xl" />

          {/* En-tête */}
          <div className="relative">
            <div className="flex items-center justify-between">
              <BrandLogo href="/" className="[&_svg]:h-6" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
                Application Client Active
              </span>
            </div>
            <p className="mt-4 text-base font-bold leading-snug">
              Votre dépannage en toute sérénité.
            </p>
          </div>

          {/* Garanties façon notifications */}
          <ul className="relative mt-4 space-y-2.5" aria-label="Garanties Relio">
            {GUARANTEES.map((item) => (
              <li key={item.title} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-xs flex items-start gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                  <Icon name={item.icon} size="sm" />
                </span>
                <span>
                  <span className="block font-semibold text-white">{item.title}</span>
                  <span className="mt-0.5 block leading-relaxed text-slate-300">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* Widget note + techniciens */}
          <div className="relative mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                  <Icon name="star" size="sm" filled />
                </span>
                <div>
                  <p className="text-sm font-bold leading-none">4,9/5</p>
                  <p className="mt-1 text-[10px] text-slate-400">Note moyenne clients</p>
                </div>
              </div>
              <span aria-hidden className="h-8 w-px bg-white/10" />
              <div className="text-right">
                <p className="text-sm font-bold leading-none">+500</p>
                <p className="mt-1 text-[10px] text-slate-400">Techniciens prêts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
