'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import {
  getPublicTechnicianProfile,
  type PublicTechnicianProfile,
} from '@/lib/api/technician-service';
import {
  getTechnicianReputation,
  type Reputation,
} from '@/lib/api/review-service';
import {
  categoryLabel,
  kycStatusLabel,
  kycVariantFor,
} from '@/lib/technician-profile';
import { PublicTechnicianHero } from '@/components/technician/public/public-technician-hero';
import { PublicTechnicianSkeleton } from '@/components/technician/public/public-technician-skeleton';

function InfoCard({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name={icon} size="sm" className="text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function ClientTechnicianProfilePage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicTechnicianProfile | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!params?.id) return;
      try {
        const p = await getPublicTechnicianProfile(params.id);
        if (!cancelled) setProfile(p);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const r = await getTechnicianReputation(params.id);
        if (!cancelled) setReputation(r);
      } catch {
        // La réputation est optionnelle : ne bloque pas l'affichage du profil.
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  if (loading) return <PublicTechnicianSkeleton />;

  if (error && !profile) {
    return (
      <EmptyState
        title="Profil introuvable"
        description={error}
        icon={<Icon name="user" size="md" />}
        action={
          <Link href="/client/demandes">
            <Button>Retour à mes demandes</Button>
          </Link>
        }
      />
    );
  }

  if (!profile) return null;

  const hasReviews = reputation !== null && reputation.totalReviews > 0 && reputation.averageRating !== null;
  const rating = hasReviews ? reputation!.averageRating : null;
  const reviewCount = hasReviews ? reputation!.totalReviews : 0;
  const kycBadge = (
    <Badge variant={kycVariantFor(profile.kycStatus)}>
      <Icon name={profile.kycStatus === 'VERIFIED' ? 'shield-check' : 'info'} size="3.5" />
      {kycStatusLabel(profile.kycStatus)}
    </Badge>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Profil du technicien" backHref="/client/demandes" />

      <PublicTechnicianHero
        profile={profile}
        rating={rating}
        reviewCount={reviewCount}
        available={profile.isAvailable}
      />

      {profile.kycStatus === 'VERIFIED' ? (
        <div className="flex justify-center">{kycBadge}</div>
      ) : null}

      <section className="space-y-3">
        <SectionHeader title="Compétences" />
        {profile.categories.length > 0 ? (
          <Card>
            <CardContent className="flex flex-wrap gap-2 pt-5">
              {profile.categories.map((id) => (
                <Badge key={id} variant="outline">
                  {categoryLabel(id)}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune compétence renseignée.</p>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Spécialités" />
        {profile.specialties.length > 0 ? (
          <Card>
            <CardContent className="flex flex-wrap gap-2 pt-5">
              {profile.specialties.map((specialty) => (
                <Badge key={specialty} variant="outline">
                  {specialty}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune spécialité renseignée.</p>
        )}
      </section>

      {profile.experience ? (
        <InfoCard icon="briefcase" title="Expérience">
          <p className="whitespace-pre-line text-sm">{profile.experience}</p>
        </InfoCard>
      ) : null}

      {profile.serviceDescription ? (
        <InfoCard icon="badge-check" title="Services proposés">
          <p className="whitespace-pre-line text-sm">{profile.serviceDescription}</p>
        </InfoCard>
      ) : null}

      {profile.bio ? (
        <InfoCard icon="user" title="À propos">
          <p className="whitespace-pre-line text-sm">{profile.bio}</p>
        </InfoCard>
      ) : null}
    </div>
  );
}