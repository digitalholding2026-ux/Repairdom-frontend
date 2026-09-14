import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { fullName } from '@/lib/format';
import type { AuthUser } from '@/lib/api/auth-service';

export interface ClientAccountSectionProps {
  user: AuthUser;
}

export function ClientAccountSection({ user }: ClientAccountSectionProps) {
  const verified = user.emailVerified;

  return (
    <div className="space-y-3">
      <Link href="/client/profil" className="block">
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center gap-3">
            <Avatar
              src={user.avatarUrl}
              firstName={user.firstName}
              lastName={user.lastName}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">
                  {fullName(user.firstName, user.lastName)}
                </p>
                {verified ? (
                  <Badge variant="success" className="shrink-0 gap-0.5">
                    <Icon name="shield-check" size="3.5" />
                    Vérifié
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
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