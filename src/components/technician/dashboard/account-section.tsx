import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { fullName } from '@/lib/format';
import type { TechnicianProfile } from '@/lib/api/technician-service';

export interface AccountSectionProps {
  profile: TechnicianProfile;
}

export function AccountSection({ profile }: AccountSectionProps) {
  const { user } = profile;
  const isKycVerified = profile.kycStatus === 'APPROVED';

  return (
    <div className="space-y-3">
      <Link href="/technicien/profil" className="block">
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center gap-3">
            <Avatar
              src={profile.avatarUrl}
              firstName={user.firstName}
              lastName={user.lastName}
              size="lg"
              online={profile.isAvailable}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">
                  {fullName(user.firstName, user.lastName)}
                </p>
                {isKycVerified ? (
                  <Badge variant="success" className="shrink-0 gap-0.5">
                    <Icon name="shield-check" size="3.5" />
                    Vérifié
                  </Badge>
                ) : (
                  <Badge variant="warning" className="shrink-0 gap-0.5">
                    <Icon name="alert" size="3.5" />
                    KYC en cours
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {profile.city}
                {profile.specialties.length > 0
                  ? ` · ${profile.specialties.slice(0, 2).join(', ')}`
                  : ''}
              </p>
            </div>
            <span className="ml-auto">
              <Icon name="chevron-right" size="sm" className="text-muted-foreground" />
            </span>
          </CardContent>
        </Card>
      </Link>

      <Link href="/conditions-utilisation" className="block">
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon name="file" />
            </span>
            <p className="text-sm font-semibold">Conditions d&apos;utilisation</p>
            <span className="ml-auto">
              <Icon name="chevron-right" size="sm" className="text-muted-foreground" />
            </span>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
