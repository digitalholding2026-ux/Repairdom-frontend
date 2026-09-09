'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
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
  uploadTechnicianAvatar,
  type TechnicianProfile,
} from '@/lib/api/technician-service';
import { kycStatusLabel, kycVariantFor, technicianInitials } from '@/lib/technician-profile';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export default function TechnicianProfilePage() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [city, setCity] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState('');
  const [experience, setExperience] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [bio, setBio] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photoUploaded, setPhotoUploaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const p = await getTechnicianProfile();
        if (cancelled) return;
        setProfile(p);
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

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadError(null);
    setPhotoUploaded(false);

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setUploadError('Format non supporté. Choisissez une image JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setUploadError('Le fichier dépasse 5 Mo.');
      return;
    }

    setUploading(true);
    setUploadingName(`${file.name} (${formatFileSize(file.size)})`);
    try {
      const updated = await uploadTechnicianAvatar(file);
      setProfile(updated);
      setPhotoUploaded(true);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors de l’envoi de la photo.');
    } finally {
      setUploading(false);
      setUploadingName(null);
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

  const currentAvatar = profile.avatarUrl;

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
          <div className="flex items-start gap-4">
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Photo de profil"
                className="size-20 shrink-0 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xl font-semibold text-muted-foreground">
                {technicianInitials(profile.user.firstName, profile.user.lastName)}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              {uploading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner size="sm" />
                  <span className="truncate">Envoi de {uploadingName ?? 'la photo'}…</span>
                </div>
              ) : (
                <Button
                  type="button"
                  variant={currentAvatar ? 'secondary' : 'primary'}
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {currentAvatar ? 'Modifier la photo' : 'Ajouter une photo'}
                </Button>
              )}
              {!uploading && !uploadError && !photoUploaded ? (
                <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP · 5 Mo maximum.</p>
              ) : null}
              {photoUploaded ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Photo mise à jour.
                </p>
              ) : null}
              {uploadError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-300">
                  {uploadError}
                </p>
              ) : null}
            </div>
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
          <Link href={`/client/technicien/${profile.id}`} className="block">
            <Button variant="secondary" className="w-full">
              Voir mon profil public
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}