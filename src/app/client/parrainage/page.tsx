'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { getMe, homePathForRole, type AuthUser } from '@/lib/api/auth-service';
import { ParrainageOverview } from '@/components/client/parrainage/parrainage-overview';
import { ParrainageSkeleton } from '@/components/client/parrainage/parrainage-skeleton';

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

  if (loading) return <ParrainageSkeleton />;

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
    <div className="space-y-5">
      <PageHeader
        title="Parrainer un ami"
        description="Invitez vos proches sur RepairDom et partagez votre code uniquement."
        backHref="/client"
      />

      <ParrainageOverview code={code} copied={copied} onCopy={handleCopy} />

      <section className="space-y-3">
        <SectionHeader title="Partager le code" />
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={() => window.open(`https://wa.me/?text=${shareText}`, '_blank')}
        >
          <Icon name="send" size="md" />
          Partager sur WhatsApp
        </Button>
      </section>

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