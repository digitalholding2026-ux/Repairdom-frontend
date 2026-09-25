import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { TechnicianProfile } from '@/lib/api/technician-service';
import { kycStatusLabel, kycVariantFor } from '@/lib/technician-profile';
import { formatDate } from '@/lib/format';

interface ProfilHeroProps {
  profile: TechnicianProfile;
}

export function ProfilHero({ profile }: ProfilHeroProps) {
  const fullName =
    [profile.user.firstName, profile.user.lastName].filter(Boolean).join(' ') || 'Mon profil';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-gradient-from via-brand-gradient-via to-brand-gradient-to p-6 text-white shadow-pop sm:p-8">
      <div className="relative z-10 flex items-center gap-5">
        <Avatar
          src={profile.avatarUrl}
          firstName={profile.user.firstName}
          lastName={profile.user.lastName}
          size="2xl"
          alt="Photo de profil"
          className="ring-2 ring-white/25"
        />
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-xl font-bold">{fullName}</h1>
          <p className="truncate text-sm text-white/70">{profile.user.email}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
              {profile.completedInterventions} intervention{profile.completedInterventions > 1 ? 's' : ''} réalisée
              {profile.completedInterventions > 1 ? 's' : ''}
            </span>
            {/* UI-0 : pill sur gradient via token blanc translucide ; `className`
                suit la variante dans `cn()` donc `bg-white/20` l'emporte sans
                `!important`. */}
            <Badge variant={kycVariantFor(profile.kycStatus)} className="bg-white/20 text-white">
              {kycStatusLabel(profile.kycStatus)}
            </Badge>
            {profile.createdAt ? (
              <span className="text-xs text-white/50">Inscrit le {formatDate(profile.createdAt)}</span>
            ) : null}
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -right-10 size-40 rounded-full bg-white/10"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 -left-6 size-24 rounded-full bg-white/5"
      />
    </div>
  );
}