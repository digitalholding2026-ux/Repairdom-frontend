'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { ProfilHero } from '@/components/technician/profil/profil-hero';
import { AvatarUpload } from '@/components/technician/profil/avatar-upload';
import { ProfilSkeleton } from '@/components/technician/profil/profil-skeleton';
import { KycSection } from '@/components/technician/profil/kyc-section';
import { cn } from '@/lib/cn';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import {
  getTechnicianProfile,
  updateTechnicianProfile,
  getTechnicianKyc,
  type TechnicianProfile,
  type TechnicianKycOverview,
} from '@/lib/api/technician-service';
import { kycStatusLabel, kycVariantFor } from '@/lib/technician-profile';
import { logoutAndGoHome } from '@/lib/api/auth-service';

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

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [kyc, setKyc] = useState<TechnicianKycOverview | null>(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [kycError, setKycError] = useState<string | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [p, k] = await Promise.all([getTechnicianProfile(), getTechnicianKyc()]);
        if (cancelled) return;
        setProfile(p);
        setAvatarUrl(p.avatarUrl);
        setKyc(k);
        setCity(p.city);
        setCategories(p.categories);
        setSpecialties(p.specialties.join(', '));
        setExperience(p.experience ?? '');
        setServiceDescription(p.serviceDescription ?? '');
        setBio(p.bio ?? '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement.');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setKycLoading(false);
        }
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
      setAvatarUrl(updated.avatarUrl);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\u2019enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggedOut(true);
    await logoutAndGoHome();
  };

  if (loading) {
    return <ProfilSkeleton />;
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <Link href="/technicien">
          <Button variant="secondary">Retour au tableau de bord</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mon profil" description="Gérez votre profil professionnel." backHref="/technicien" />

      <ProfilHero profile={profile} />

      <div className="space-y-4">
        <SectionHeader title="Photo de profil" />
        <AvatarUpload
          avatarUrl={avatarUrl}
          onUpdated={(url) => {
            setAvatarUrl(url);
            setProfile((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
          }}
        />
      </div>

      <div className="space-y-4">
        <SectionHeader title="Informations professionnelles" />
        <div className="space-y-5">
          <Field label="Ville / zone d'intervention" htmlFor="profil-ville" required>
            <Input
              id="profil-ville"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex. : Douala"
              maxLength={120}
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-sm font-medium">
              Compétences <span className="ml-0.5 text-error" aria-hidden>*</span>
            </span>
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

          <Field
            label="Spécialités"
            htmlFor="profil-specialites"
            hint="Séparées par des virgules."
          >
            <Input
              id="profil-specialites"
              value={specialties}
              onChange={(e) => setSpecialties(e.target.value)}
              placeholder="Ex. : Smartphones, Ordinateurs, Tablettes"
              maxLength={400}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader title="Présentation" />
        <div className="space-y-4">
          <Field label="Bio" htmlFor="profil-bio">
            <Textarea
              id="profil-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Parlez de vous, de vos méthodes…"
              rows={3}
              maxLength={2000}
            />
          </Field>
          <Field label="Expérience" htmlFor="profil-experience">
            <Textarea
              id="profil-experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Ex. : 5 ans d’expérience dans la réparation des smartphones…"
              rows={3}
              maxLength={2000}
            />
          </Field>
          <Field label="Description des services" htmlFor="profil-services">
            <Textarea
              id="profil-services"
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Ex. : remplacement d’écran, réparation de carte mère…"
              rows={3}
              maxLength={2000}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader title="Statut du compte" />
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Identité</span>
            <Badge variant={kycVariantFor(profile.kycStatus)}>
              {kycStatusLabel(profile.kycStatus)}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Vérifiée manuellement par Relio. Ce statut peut être complété via la section ci-dessous.
          </p>
          <Link href={`/client/technicien/${profile.id}`} className="mt-3 block">
            <Button variant="secondary" className="w-full">
              Voir mon profil public
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader title="Vérification de votre profil" />
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-4 text-sm text-muted-foreground">
            Relio vérifie manuellement votre identité.
          </p>
          {kycLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" /> Chargement…
            </div>
          ) : kyc ? (
            <KycSection
              kyc={kyc}
              onUpdated={(overview) => {
                setKyc(overview);
                setProfile((prev) => (prev ? { ...prev, kycStatus: overview.status } : prev));
              }}
            />
          ) : (
            <Alert variant="error">{kycError ?? 'Impossible de charger votre dossier.'}</Alert>
          )}
        </div>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {saved ? <Alert variant="success" dense>Profil enregistré.</Alert> : null}

      <Button onClick={handleSave} isLoading={saving} disabled={!canSave} className="w-full" size="lg">
        Enregistrer le profil
      </Button>

      <div className="flex flex-col gap-2 pt-2">
        <Link href="/technicien" className="block">
          <Button variant="secondary" className="w-full">
            Retour au tableau de bord
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full text-error-ink hover:bg-error-soft"
          onClick={handleLogout}
          isLoading={loggedOut}
        >
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}