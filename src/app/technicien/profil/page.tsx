'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/cn';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import {
  getTechnicianProfile,
  updateTechnicianProfile,
  type TechnicianProfile,
} from '@/lib/api/technician-service';
import { kycStatusLabel, kycVariantFor } from '@/lib/technician-profile';

export default function TechnicianProfilePage() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState('');
  const [city, setCity] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState('');
  const [experience, setExperience] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const p = await getTechnicianProfile();
        if (cancelled) return;
        setProfile(p);
        setAvatarUrl(p.avatarUrl ?? '');
        setCity(p.city);
        setCategories(p.categories);
        setSpecialties(p.specialties.join(', '));
        setExperience(p.experience ?? '');
        setServiceDescription(p.serviceDescription ?? '');
        setBio(p.bio ?? '');
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
  }, []);

  const toggleCategory = (id: string) => {
    setCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const canSave = city.trim() !== '' && categories.length > 0;

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await updateTechnicianProfile({
        city: city.trim(),
        categories,
        avatarUrl: avatarUrl.trim() || null,
        bio: bio.trim() || null,
        experience: experience.trim() || null,
        serviceDescription: serviceDescription.trim() || null,
        specialties: specialties
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setProfile(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
        <Link href="/technicien">
          <Button variant="secondary">Retour au tableau de bord</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/technicien" className="text-sm font-medium text-primary hover:underline">
        ← Retour au tableau de bord
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mon profil professionnel</CardTitle>
          <CardDescription>
            Ces informations sont visibles par les clients lorsqu’ils consultent votre profil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Photo (URL)</span>
              <Input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://exemple.com/photo.jpg"
                maxLength={510}
              />
            </label>
          </div>

          <div className="space-y-1">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Ville / zone d’intervention *</span>
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Ex. : Douala"
                maxLength={120}
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium">Compétences *</span>
            <div className="grid gap-2" role="group" aria-label="Compétences">
              {REQUEST_CATEGORIES.map((category) => {
                const selected = categories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected
                        ? 'border-primary bg-secondary text-secondary-foreground'
                        : 'border-border bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    <span className="block text-sm font-medium">{category.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Spécialités (séparées par des virgules)</span>
              <Input
                value={specialties}
                onChange={(event) => setSpecialties(event.target.value)}
                placeholder="Ex. : Smartphones, Ordinateurs, Tablettes"
                maxLength={400}
              />
            </label>
          </div>

          <div className="space-y-1">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Expérience</span>
              <Textarea
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
                placeholder="Ex. : 5 ans d’expérience dans la réparation des smartphones…"
                rows={3}
                maxLength={2000}
              />
            </label>
          </div>

          <div className="space-y-1">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Description des services</span>
              <Textarea
                value={serviceDescription}
                onChange={(event) => setServiceDescription(event.target.value)}
                placeholder="Ex. : remplacement d’écran, réparation de carte mère…"
                rows={3}
                maxLength={2000}
              />
            </label>
          </div>

          <div className="space-y-1">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Présentation</span>
              <Textarea
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Parlez de vous, de vos méthodes…"
                rows={3}
                maxLength={2000}
              />
            </label>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {saved ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300">
              Profil enregistré.
            </div>
          ) : null}

          <Button onClick={handleSave} isLoading={saving} disabled={!canSave} className="w-full" size="lg">
            Enregistrer le profil
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statut de votre profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Identité</span>
            <Badge variant={kycVariantFor(profile.kycStatus)}>{kycStatusLabel(profile.kycStatus)}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Vérifiée manuellement par RepairDom. Ce statut ne peut pas être modifié vous-même.
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Interventions réalisées</span>
            <span className="text-sm font-semibold">{profile.completedInterventions}</span>
          </div>
          {profile?.id ? (
            <Link href={`/client/technicien/${profile.id}`} className="block">
              <Button variant="secondary" className="w-full">
                Voir mon profil public
              </Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}