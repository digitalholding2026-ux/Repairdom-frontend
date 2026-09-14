import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { AuthUser } from '@/lib/api/auth-service';
import { formatDate } from '@/lib/format';

interface ProfilHeroProps {
  user: AuthUser;
}

export function ProfilHero({ user }: ProfilHeroProps) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Mon profil';

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-gradient-from via-[#6d28d9] to-brand-gradient-to p-6 text-white shadow-pop sm:p-8">
      <div className="relative z-10 flex items-center gap-5">
        <Avatar
          src={user.avatarUrl}
          firstName={user.firstName}
          lastName={user.lastName}
          size="2xl"
          alt="Photo de profil"
          className="ring-2 ring-white/25"
        />
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-xl font-bold">{fullName}</h1>
          <p className="truncate text-sm text-white/70">{user.email}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {user.emailVerified ? (
              <Badge variant="success" className="!bg-white/20 !text-white">
                Email vérifié
              </Badge>
            ) : (
              <a
                href="/client/verification"
                className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white transition hover:bg-white/25"
              >
                Vérifier mon email
              </a>
            )}
            {user.createdAt ? (
              <span className="text-xs text-white/50">
                Inscrit le {formatDate(user.createdAt)}
              </span>
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
