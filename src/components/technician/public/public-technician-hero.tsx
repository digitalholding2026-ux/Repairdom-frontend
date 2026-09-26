import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import type { PublicTechnicianProfile } from '@/lib/api/technician-service';
import { fullName } from '@/lib/format';
import { RatingStars } from '@/components/ui/rating-stars';

interface PublicTechnicianHeroProps {
  profile: PublicTechnicianProfile;
  rating: number | null;
  reviewCount: number;
  available: boolean;
}

export function PublicTechnicianHero({ profile, rating, reviewCount, available }: PublicTechnicianHeroProps) {
  const name = fullName(profile.firstName, profile.lastName) || 'Technicien';
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-gradient-from via-brand-gradient-via to-brand-gradient-to p-5 text-white shadow-pop sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full bg-white/15 blur-2xl"
      />
      <div
        aria-hidden
        className="motion-safe:animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/30"
      />

      <div className="relative flex items-center gap-4">
        <Avatar
          src={profile.avatarUrl}
          firstName={profile.firstName}
          lastName={profile.lastName}
          size="2xl"
          className="ring-2 ring-white/25"
        />
        <div className="min-w-0 space-y-1">
          {/* UI-6 : la page porte déjà le h1 — le nom reste au niveau h2, visuel inchangé. */}
          <h2 className="truncate text-xl font-bold">{name}</h2>
          {profile.city ? (
            <p className="flex items-center gap-1.5 text-sm text-white/70">
              <Icon name="pin" size="3.5" />
              {profile.city}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                available ? 'bg-emerald-300/20 text-emerald-100' : 'bg-white/15 text-white/80'
              }`}
            >
              <Icon name={available ? 'check-circle' : 'clock'} size="3.5" />
              {available ? 'Disponible' : 'Indisponible'}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
              {profile.completedInterventions} intervention{profile.completedInterventions > 1 ? 's' : ''} réalisée
              {profile.completedInterventions > 1 ? 's' : ''}
            </span>
          </div>
          {rating !== null ? (
            <div className="flex items-center gap-2 pt-0.5">
              <RatingStars value={rating} size="sm" />
              <span className="text-xs font-medium text-white">
                {rating.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs text-white/70">{reviewCount} évaluation{reviewCount > 1 ? 's' : ''}</span>
            </div>
          ) : (
            <p className="text-xs text-white/60">Aucune évaluation pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
}