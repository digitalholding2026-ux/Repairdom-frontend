'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { RatingStars } from '@/components/ui/rating-stars';
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
import { fullName } from '@/lib/format';

function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <Badge variant={available ? 'success' : 'neutral'}>
      <Icon name={available ? 'check-circle' : 'clock'} size="3.5" />
      {available ? 'Disponible' : 'Indisponible'}
    </Badge>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <EmptyState
        title="Profil introuvable"
        description={error}
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

  return (
    <div className="space-y-4">
      <PageHeader title="Profil du technicien" backHref="/client/demandes" />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-4">
            <Avatar size="2xl" src={profile.avatarUrl} firstName={profile.firstName} lastName={profile.lastName} />
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-lg font-bold leading-tight">{fullName(profile.firstName, profile.lastName)}</h1>
              {profile.city ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon name="pin" size="3.5" />
                  {profile.city}
                </p>
              ) : null}
              <AvailabilityBadge available={profile.isAvailable} />
              {hasReviews ? (
                <div className="flex items-center gap-2">
                  <RatingStars value={reputation!.averageRating!} size="sm" showValue />
                  <p className="text-xs text-muted-foreground">
                    {reputation!.totalReviews} évaluation{reputation!.totalReviews > 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucune évaluation pour le moment.</p>
              )}
            </div>
          </div>

          <Badge variant={kycVariantFor(profile.kycStatus)}>
            <Icon name={profile.kycStatus === 'VERIFIED' ? 'shield-check' : 'info'} size="3.5" />
            {kycStatusLabel(profile.kycStatus)}
          </Badge>
        </CardContent>
      </Card>

      {profile.categories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="wrench" size="sm" className="text-muted-foreground" />
              Compétences
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {profile.categories.map((id) => (
              <Badge key={id} variant="outline">
                {categoryLabel(id)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {profile.specialties.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="sparkles" size="sm" className="text-muted-foreground" />
              Spécialités
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {profile.specialties.map((specialty) => (
              <Badge key={specialty} variant="outline">
                {specialty}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {profile.experience ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="briefcase" size="sm" className="text-muted-foreground" />
              Expérience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{profile.experience}</p>
          </CardContent>
        </Card>
      ) : null}

      {profile.serviceDescription ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="badge-check" size="sm" className="text-muted-foreground" />
              Services proposés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{profile.serviceDescription}</p>
          </CardContent>
        </Card>
      ) : null}

      {profile.bio ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon name="user" size="sm" className="text-muted-foreground" />
              À propos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{profile.bio}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Icon name="check-circle" size="sm" className="text-muted-foreground" />
            Interventions réalisées
          </span>
          <span className="text-lg font-bold">{profile.completedInterventions}</span>
        </CardContent>
      </Card>
    </div>
  );
}