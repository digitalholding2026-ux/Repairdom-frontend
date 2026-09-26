'use client';

import { motion } from 'framer-motion';
import { Icon } from '@/components/ui/icon';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/* Mascotte interactive du technicien Relio (SVG + Framer Motion, 100 %
 * robuste SSR — aucun Canvas/WebGL) :
 * - 0 % : mallette fermée, technicien au repos (respiration + clignement).
 * - 0 → 30 % : le couvercle s'ouvre, les outils se mettent à léviter.
 * - 12 / 38 / 62 % : clé, tournevis puis engrenage apparaissent.
 * - 100 % : pouce levé, hochement de tête, verrou lumineux pulsant.
 * Les pupilles suivent la progression comme si le technicien lisait la saisie. */
export function RegisterMascot3D({
  completionPercentage,
}: {
  completionPercentage: number;
}) {
  const p = clamp(Math.round(completionPercentage), 0, 100);
  const ready = p >= 100;
  const filling = p > 0 && p < 100;

  const openAmount = clamp(p / 30, 0, 1);
  const lidAngle = -62 * openAmount;
  const lookX = -6 + (p / 100) * 12;

  const tools = [
    { key: 'wrench', x: 112, threshold: 12, rise: -96 },
    { key: 'screwdriver', x: 152, threshold: 38, rise: -116 },
    { key: 'gear', x: 194, threshold: 62, rise: -96 },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-1 flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl w-full min-h-[500px] lg:min-h-[600px]">
      {/* Halos décoratifs */}
      <div aria-hidden className="pointer-events-none absolute -top-20 -left-20 size-56 rounded-full bg-[#F97316]/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 size-64 rounded-full bg-[#FB923C]/10 blur-3xl" />
      <div aria-hidden className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="relative w-full max-w-sm">
        <svg
          viewBox="0 0 360 440"
          role="img"
          aria-label={`Technicien Relio et sa mallette — formulaire complété à ${p} %`}
          className="h-auto w-full"
        >
          <defs>
            <linearGradient id="m3d-body" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
            <radialGradient id="m3d-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ombre au sol */}
          <ellipse cx="180" cy="412" rx="112" ry="13" fill="#000" opacity="0.4" />

          {/* Lueur intérieure de la mallette (visible à l'ouverture) */}
          <motion.ellipse
            cx="145"
            cy="316"
            rx="62"
            ry="16"
            fill="url(#m3d-glow)"
            animate={{ opacity: 0.15 + 0.65 * openAmount }}
            transition={{ duration: 0.4 }}
          />

          {/* Outils en lévitation */}
          {tools.map((tool, i) => {
            const visible = p >= tool.threshold;
            return (
              <motion.g
                key={tool.key}
                initial={false}
                animate={{
                  y: visible ? [tool.rise, tool.rise - 9, tool.rise] : 10,
                  opacity: visible ? 1 : 0,
                }}
                transition={
                  visible
                    ? { duration: 2.4 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.3 }
                }
              >
                {tool.key === 'wrench' ? (
                  <g transform={`translate(${tool.x},318)`}>
                    <rect x="-5" y="-44" width="10" height="44" rx="5" fill="#E2E8F0" />
                    <circle cx="0" cy="-50" r="11" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                    <circle cx="0" cy="-50" r="11" fill="none" stroke="#0B0D12" strokeWidth="8" strokeDasharray="18 52" opacity="0.35" />
                  </g>
                ) : null}
                {tool.key === 'screwdriver' ? (
                  <g transform={`translate(${tool.x},318)`}>
                    <rect x="-3.5" y="-52" width="7" height="34" rx="3.5" fill="#CBD5E1" />
                    <rect x="-8" y="-22" width="16" height="24" rx="7" fill="#EA580C" />
                    <rect x="-8" y="-16" width="16" height="4" fill="#0B0D12" opacity="0.3" />
                  </g>
                ) : null}
                {tool.key === 'gear' ? (
                  <g transform={`translate(${tool.x},312)`}>
                    {[0, 60, 120, 180, 240, 300].map((deg) => (
                      <rect key={deg} x="-5" y="-26" width="10" height="14" rx="3" fill="#FBBF24" transform={`rotate(${deg})`} />
                    ))}
                    <circle r="20" fill="#FBBF24" />
                    <circle r="8" fill="#0B0D12" />
                  </g>
                ) : null}
              </motion.g>
            );
          })}

          {/* Corps de la mallette */}
          <rect x="70" y="318" width="150" height="80" rx="12" fill="url(#m3d-body)" />
          <rect x="70" y="318" width="150" height="18" rx="9" fill="#0B0D12" opacity="0.22" />
          <rect x="80" y="330" width="40" height="6" rx="3" fill="#fff" opacity="0.35" />
          {/* Serrure */}
          <rect x="133" y="312" width="24" height="18" rx="4" fill="#0B0D12" opacity="0.6" />
          {/* Impulsion lumineuse de verrouillage à 100 % */}
          <motion.rect
            x="133"
            y="312"
            width="24"
            height="18"
            rx="4"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="3"
            initial={false}
            animate={ready ? { opacity: [0.2, 1, 0.2], scale: [1, 1.25, 1] } : { opacity: 0, scale: 1 }}
            transition={ready ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />

          {/* Couvercle articulé (charnière à gauche) */}
          <motion.g
            initial={false}
            animate={{ rotate: lidAngle }}
            transition={{ type: 'spring', stiffness: 120, damping: 16 }}
            style={{ transformBox: 'fill-box', transformOrigin: '0% 85%' }}
          >
            <rect x="70" y="288" width="150" height="32" rx="10" fill="#C2410C" />
            <rect x="118" y="276" width="54" height="18" rx="9" fill="none" stroke="#F8FAFC" strokeWidth="8" />
          </motion.g>

          {/* Technicien */}
          <motion.g
            initial={false}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {/* Buste / combinaison */}
            <rect x="216" y="252" width="100" height="150" rx="26" fill="#1F2937" />
            <rect x="232" y="252" width="13" height="150" fill="#F97316" opacity="0.9" />
            <rect x="287" y="252" width="13" height="150" fill="#F97316" opacity="0.9" />
            <rect x="248" y="330" width="36" height="10" rx="5" fill="#FBBF24" opacity="0.85" />

            {/* Bras gauche (repos) */}
            <rect x="200" y="268" width="22" height="80" rx="11" fill="#1F2937" transform="rotate(12 211 268)" />
            <circle cx="196" cy="348" r="12" fill="#FCD9B8" />

            {/* Bras droit : pouce levé à 100 % */}
            <motion.g
              initial={false}
              animate={{ rotate: ready ? -148 : 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 14 }}
              style={{ transformBox: 'fill-box', transformOrigin: '50% 6%' }}
            >
              <g transform="translate(304,272)">
                <rect x="-11" y="0" width="22" height="72" rx="11" fill="#1F2937" />
                <circle cx="0" cy="82" r="13" fill="#FCD9B8" />
                <rect x="-4" y="58" width="8" height="18" rx="4" fill="#FCD9B8" transform="rotate(-18)" />
              </g>
            </motion.g>

            {/* Tête (hochement à 100 %) */}
            <motion.g
              initial={false}
              animate={ready ? { y: [0, -7, 0], rotate: [0, -2.5, 2.5, 0] } : { y: 0, rotate: 0 }}
              transition={ready ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
              <rect x="252" y="212" width="26" height="26" rx="8" fill="#FCD9B8" />
              <circle cx="265" cy="188" r="35" fill="#FCD9B8" />
              {/* Casque */}
              <path d="M230 186 a35 35 0 0 1 70 0 z" fill="#F97316" />
              <rect x="222" y="180" width="86" height="11" rx="5.5" fill="#EA580C" />
              <rect x="260" y="140" width="10" height="16" rx="5" fill="#EA580C" />
              <circle cx="265" cy="162" r="5" fill="#FBBF24" />
              {/* Yeux réactifs */}
              <circle cx="252" cy="192" r="8.5" fill="#fff" />
              <circle cx="279" cy="192" r="8.5" fill="#fff" />
              <motion.g
                initial={false}
                animate={{ x: lookX, scaleY: [1, 1, 0.12, 1, 1] }}
                transition={{
                  x: { duration: 0.35 },
                  scaleY: { duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1] },
                }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              >
                <circle cx="252" cy="193" r="3.6" fill="#0B0D12" />
                <circle cx="279" cy="193" r="3.6" fill="#0B0D12" />
              </motion.g>
              {/* Sourcils */}
              <motion.g
                initial={false}
                animate={{ y: ready ? -3 : filling ? -1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <rect x="244" y="176" width="16" height="4" rx="2" fill="#0B0D12" opacity="0.7" />
                <rect x="271" y="176" width="16" height="4" rx="2" fill="#0B0D12" opacity="0.7" />
              </motion.g>
              {/* Sourire : discret puis franc à 80 %+ */}
              <motion.path
                d="M255 210 q10 6 20 0"
                stroke="#0B0D12"
                strokeWidth="3.5"
                fill="none"
                strokeLinecap="round"
                initial={false}
                animate={{ opacity: p >= 80 ? 0 : 1 }}
              />
              <motion.path
                d="M250 208 q15 14 30 0 q-3 12 -15 12 q-12 0 -15 -12"
                fill="#7C2D12"
                initial={false}
                animate={{ opacity: p >= 80 ? 1 : 0 }}
              />
              <circle cx="241" cy="202" r="5" fill="#F97316" opacity="0.35" />
              <circle cx="290" cy="202" r="5" fill="#F97316" opacity="0.35" />
            </motion.g>
          </motion.g>

          {/* Étincelles pendant la saisie */}
          {filling ? (
            <motion.g
              initial={false}
              animate={{ y: [0, -16, 0], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              fill="#FBBF24"
            >
              <circle cx="66" cy="250" r="4" />
              <circle cx="240" cy="120" r="3.5" />
              <circle cx="322" cy="230" r="4.5" />
            </motion.g>
          ) : null}

          {/* Halo de validation */}
          <motion.circle
            cx="265"
            cy="188"
            r="52"
            fill="none"
            stroke="#34D399"
            strokeWidth="4"
            initial={false}
            animate={ready ? { opacity: [0, 0.9, 0], scale: [0.85, 1.15, 1.15] } : { opacity: 0 }}
            transition={ready ? { duration: 1.8, repeat: Infinity, ease: 'easeOut' } : { duration: 0.2 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          />
        </svg>

        {/* Badge progression flottant */}
        <span className="animate-float absolute -right-1 top-1 hidden items-center gap-1.5 rounded-full border border-[#F97316]/40 bg-[#F97316]/20 px-3 py-1 text-xs font-semibold text-[#F97316] backdrop-blur-md sm:inline-flex">
          <Icon name="wrench" size="sm" />
          {p}%
        </span>
      </div>
    </div>
  );
}
