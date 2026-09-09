'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getPublicTechnicianProfile,
  type PublicTechnicianProfile,
} from '@/lib/api/technician-service';
import {
  categoryLabel,
  kycStatusLabel,
  kycVariantFor,
  technicianInitials,
} from '@/lib/technician-profile';

function Avatar({ profile }: { profile: PublicTechnicianProfile }) {
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  if (profile.avatarUrl) {
    return (
      <img
        src={profile.avatarUrl}
        alt={`Photo de ${name}`}
        className="size-20 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <div className="flex size-20 items-center justify-center rounded-full border border-border bg-muted text-xl font-semibold text-muted-foreground">
      {technicianInitials(profile.firstName, profile.lastName)}
    </div>
  );
}

export default function ClientTechnicianProfilePage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicTechnicianProfile | null>(null);
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
      } finally {
        if (!cancelled) setLoading(false);
      }
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

  return (
    <div className="space-y-4">
      <Link href="/client/demandes" className="text-sm font-medium text-primary hover:underline">
        ← Retour à mes demandes
      </Link>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-4">
            <Avatar profile={profile} />
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">
                {profile.firstName}
                {profile.lastName ? ` ${profile.lastName}` : ''}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">📍 {profile.city}</p>
              <div className="mt-1.5">
                <Badge variant={profile.isAvailable ? 'success' : 'neutral'}>
                  {profile.isAvailable ? '🟢 Disponible' : '⚪ Indisponible'}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <Badge variant={kycVariantFor(profile.kycStatus)}>
              {profile.kycStatus === 'VERIFIED' ? '✓ ' : ''}
              {kycStatusLabel(profile.kycStatus)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {profile.categories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compétences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {profile.categories.map((id) => (
              <Badge key={id} variant="neutral">
                🔧 {categoryLabel(id)}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {profile.specialties.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spécialités</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {profile.specialties.map((specialty) => (
              <Badge key={specialty} variant="neutral">
                {specialty}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {profile.experience ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expérience</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{profile.experience}</p>
          </CardContent>
        </Card>
      ) : null}

      {profile.serviceDescription ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Services proposés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{profile.serviceDescription}</p>
          </CardContent>
        </Card>
      ) : null}

      {profile.bio ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">À propos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{profile.bio}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <span className="text-sm font-medium">Interventions réalisées</span>
          <span className="text-lg font-bold">{profile.completedInterventions}</span>
        </CardContent>
      </Card>
    </div>
  );
}