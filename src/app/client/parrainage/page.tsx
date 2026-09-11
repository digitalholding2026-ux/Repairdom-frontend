'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';
import { getMe, homePathForRole, type AuthUser } from '@/lib/api/auth-service';

function buildReferralCode(id: string): string {
  // Code basé sur l'identifiant unique (non cryptographique — simulation uniquement).
  return `RD-${id.slice(0, 6).toUpperCase()}`;
}

export default function ClientParrainagePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        if (me.role !== 'CLIENT') {
          router.replace(homePathForRole(me.role));
          return;
        }
        setUser(me);
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

  const code = buildReferralCode(user.id);
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://repairdom.vercel.app';
  const shareText = encodeURIComponent(
    `Rejoins RepairDom avec mon lien et bénéficie d'un dépannage vérifié !\n${shareUrl}?parrain=${code}`,
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Parrainer un ami</h1>
        <p className="text-sm text-muted-foreground">
          Partagez votre code et invitez vos proches sur RepairDom.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="users" size="lg" />
          </span>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Votre code parrain</p>
            <p className="font-mono text-2xl font-bold tracking-wider text-primary">{code}</p>
          </div>
          <Button variant="secondary" onClick={handleCopy} className="gap-2">
            <Icon name="check" size="sm" />
            {copied ? 'Code copié !' : 'Copier le code'}
          </Button>
        </CardContent>
      </Card>

      <Button
        className="w-full gap-2"
        size="lg"
        onClick={() => window.open(`https://wa.me/?text=${shareText}`, '_blank')}
      >
        <Icon name="send" size="md" />
        Partager sur WhatsApp
      </Button>

      <Alert variant="info" dense icon="info">
        Aucun crédit fictif n&apos;est attribué pour le moment. Cette fonctionnalité sera activée
        lors de la mise en place du système de récompenses.
      </Alert>

      <Link href="/client" className="block">
        <Button variant="secondary" className="w-full">
          Retour à l&apos;accueil
        </Button>
      </Link>
    </div>
  );
}