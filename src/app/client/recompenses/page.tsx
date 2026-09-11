'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';
import { getMe, homePathForRole, type AuthUser } from '@/lib/api/auth-service';
import { listMyDemandeHistory, type DemandeListItem } from '@/lib/api/request-service';

const REWARD_TARGET = 5;

export default function ClientRecompensesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then(async (me) => {
        if (cancelled) return;
        if (me.role !== 'CLIENT') {
          router.replace(homePathForRole(me.role));
          return;
        }
        setUser(me);
        const history = await listMyDemandeHistory().catch(() => []);
        if (!cancelled) {
          setCompletedCount(history.filter((d: DemandeListItem) => d.status === 'CONFIRMED').length);
        }
      })
      .catch(() => router.replace('/client/connexion'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const progress = Math.min(completedCount / REWARD_TARGET, 1);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Mes récompenses</h1>
        <p className="text-sm text-muted-foreground">
          Suivez votre progression vers vos prochaines récompenses.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="sparkles" size="lg" />
          </span>
          <div className="space-y-2">
            <p className="font-mono text-3xl font-bold tracking-tight text-primary">
              {completedCount} / {REWARD_TARGET}
            </p>
            <p className="text-sm text-muted-foreground">dépannages terminés</p>
          </div>
          <div className="mx-auto h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="space-y-3 py-6 text-center">
          <p className="text-sm font-semibold">Programme bientôt disponible</p>
          <p className="text-xs text-muted-foreground">
            Les récompenses seront débloquées après 5 dépannages validés.
            Restez connecté !
          </p>
        </CardContent>
      </Card>

      <Link href="/client" className="block">
        <Button variant="secondary" className="w-full">
          Retour à l&apos;accueil
        </Button>
      </Link>
    </div>
  );
}