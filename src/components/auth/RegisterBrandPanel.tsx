import { Icon, type IconName } from '@/components/ui/icon';

const GUARANTEES: Array<{ icon: IconName; text: string }> = [
  { icon: 'zap', text: 'Intervention rapide & devis transparent' },
  { icon: 'shield-check', text: 'Techniciens vérifiés et qualifiés' },
  { icon: 'wallet', text: 'Paiement sécurisé via Mobile Money & Carte' },
];

/* Panneau de réassurance (colonne gauche de l'inscription) : marque,
 * garanties et preuve sociale — sans aucune animation. */
export function RegisterBrandPanel() {
  return (
    <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 flex flex-col justify-between gap-8 relative overflow-hidden shadow-2xl w-full h-full">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-orange-500/15 blur-3xl" />

      {/* En-tête brand */}
      <div className="relative">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold">
          <Icon name="sparkles" size="sm" />
          Relio — Dépannage en confiance
        </span>
        <p className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
          Votre dépannage en toute sérénité.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          Accédez aux meilleurs artisans et techniciens certifiés de votre ville en quelques clics.
        </p>
      </div>

      {/* Garanties */}
      <ul className="relative space-y-3">
        {GUARANTEES.map((item) => (
          <li key={item.text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
              <Icon name={item.icon} size="md" />
            </span>
            <span className="text-sm font-medium text-slate-100">{item.text}</span>
          </li>
        ))}
      </ul>

      {/* Statistiques & avis */}
      <div className="relative bg-slate-900/80 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-bold leading-none text-white">+500</p>
          <p className="mt-1 text-xs text-slate-400">Techniciens prêts à intervenir</p>
        </div>
        <span aria-hidden className="h-10 w-px bg-white/10" />
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 text-lg font-bold leading-none text-white">
            4,9/5
            <Icon name="star" size="sm" filled className="text-amber-400" />
          </p>
          <p className="mt-1 text-xs text-slate-400">Note moyenne des interventions client</p>
        </div>
      </div>
    </div>
  );
}
