'use client';

/**
 * Profil professionnel du technicien.
 *
 * PAGE DISTINCTE de la KYC (`/technicien/kyc`) : le profil porte les
 * informations de MÉTIER (identité commerciale, contact, activité,
 * compétences, zones). La vérification d'identité — date de naissance,
 * nationalité, pièce d'identité — est ailleurs, avec son propre parcours.
 *
 * Les sections sont volontairement séparées : une seule page de 15 champs
 * serait illisible. Aucune donnée dupliquée : les champs d'identité KYC ne
 * sont ni demandés ni affichés ici, la section « Vérification » se contente du
 * statut + d'un lien vers la page KYC.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { ProfilHero } from '@/components/technician/profil/profil-hero';
import { AvatarUpload } from '@/components/technician/profil/avatar-upload';
import { ProfilSkeleton } from '@/components/technician/profil/profil-skeleton';
import { PushNotificationCard } from '@/components/ui/push-notification-card';
import {
  ActivitySection,
  BIO_MAX_LENGTH,
  ContactSection,
  MAX_EXPERIENCE_YEARS,
  MIN_EXPERIENCE_YEARS,
  SkillsSection,
  SPECIALTIES_MAX_ITEMS,
  type ActivityValues,
  type ContactValues,
  type SkillsValues,
} from '@/components/technician/profil/profile-sections';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import {
  getTechnicianProfile,
  updateTechnicianProfile,
  type TechnicianProfile,
} from '@/lib/api/technician-service';
import { listEquipmentFamilies, type EquipmentFamilyLite } from '@/lib/api/catalog-service';
import { listCities, type City } from '@/lib/api/cities-service';
import { toActionableErrorMessage, toUserErrorMessage } from '@/lib/ui-error-message';
import { kycStatusLabel, kycVariantFor } from '@/lib/technician-profile';
import { logoutAndGoHome, updateMe } from '@/lib/api/auth-service';

function normalizeCityName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function TechnicianProfilePage() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [city, setCity] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const [contact, setContact] = useState<ContactValues>({ phone: '', whatsapp: '' });
  const [activity, setActivity] = useState<ActivityValues>({
    activityType: null,
    experienceYears: '',
    bio: '',
  });
  const [skills, setSkills] = useState<SkillsValues>({
    categories: [],
    familyCodes: [],
    specialties: '',
  });

  const [families, setFamilies] = useState<EquipmentFamilyLite[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [familiesError, setFamiliesError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const p = await getTechnicianProfile();
        if (cancelled) return;
        setProfile(p);
        setAvatarUrl(p.avatarUrl);
        setCity(p.city);
        setContact({ phone: p.user.phone ?? '', whatsapp: p.user.whatsapp ?? '' });
        setActivity({
          activityType: p.activityType,
          experienceYears: p.experienceYears === null ? '' : String(p.experienceYears),
          bio: p.bio ?? '',
        });
        setSkills({
          categories: p.categories,
          familyCodes: p.familyCodes,
          specialties: p.specialties.join(', '),
        });
      } catch (err) {
        if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadCities() {
      try {
        const list = await listCities();
        if (!cancelled) {
          setCities(list);
          setCitiesError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setCitiesError(toUserErrorMessage(err, 'Impossible de charger les villes.'));
        }
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }

    async function loadFamilies() {
      try {
        const list = await listEquipmentFamilies();
        if (!cancelled) {
          setFamilies(list);
          setFamiliesError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setFamiliesError(
            toUserErrorMessage(err, 'Familles d’équipements indisponibles.'),
          );
        }
      } finally {
        if (!cancelled) setFamiliesLoading(false);
      }
    }

    load();
    loadCities();
    loadFamilies();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Ville issue du référentiel ServiceCity (GET /cities, source d’autorité).
   * Le contrat PATCH /technician/profile n’accepte que le texte `city`
   * (pas de `cityId`) : on envoie le nom EXACT sélectionné, que le backend
   * rattache à la ville (resolveCityId). Aucune saisie libre. */
  const matchedCity = useMemo(
    () =>
      cities.find((candidate) => normalizeCityName(candidate.name) === normalizeCityName(city)) ??
      null,
    [cities, city],
  );
  const cityMismatch = city.trim() !== '' && !citiesLoading && !citiesError && !matchedCity;

  /* Les valeurs envoyées au backend sont dérivées ICI et réutilisées par le
   * rendu, afin que les contrôles de saisie et l'envoi ne puissent pas
   * diverger (envoyer 1000 alors que le champ « désactivé »). */
  const experienceYearsNumber =
    activity.experienceYears === '' ? null : Number(activity.experienceYears);
  const specialtiesList = skills.specialties
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  /* Mêmes règles que `@IsInt @Min(0) @Max(70)` côté backend : sans ce contrôle,
   * la saisie était acceptée puis rejetée par un 400 générique sans dire
   * quel champ posait problème. */
  const experienceYearsInvalid =
    experienceYearsNumber !== null &&
    (!Number.isInteger(experienceYearsNumber) ||
      experienceYearsNumber < MIN_EXPERIENCE_YEARS ||
      experienceYearsNumber > MAX_EXPERIENCE_YEARS);

  const bioTooLong = activity.bio.length > BIO_MAX_LENGTH;
  const tooManySpecialties = specialtiesList.length > SPECIALTIES_MAX_ITEMS;

  const canSave =
    matchedCity !== null &&
    skills.categories.length > 0 &&
    !experienceYearsInvalid &&
    !bioTooLong &&
    !tooManySpecialties;

  /* Les numéros d'appel et WhatsApp vivent sur `User` (source unique) : ils
   * sont enregistrés via PATCH /auth/me, PAS via le profil technicien. */
  const contactsDirty = useMemo(() => {
    if (!profile) return false;
    return contact.phone !== (profile.user.phone ?? '') ||
      contact.whatsapp !== (profile.user.whatsapp ?? '');
  }, [contact, profile]);

  const handleSave = useCallback(async () => {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      /* Un seul point de vérité : le profil n'écrit que ses propres colonnes,
       * `phone`/`whatsapp` passent par /auth/me. */
      const [updated] = await Promise.all([
        updateTechnicianProfile({
          city: matchedCity ? matchedCity.name : city.trim(),
          categories: skills.categories,
          familyCodes: skills.familyCodes,
          specialties: specialtiesList,
          activityType: activity.activityType,
          experienceYears: experienceYearsNumber,
          bio: activity.bio.trim() || null,
        }),
        contactsDirty
          ? updateMe({
              phone: contact.phone.trim() || null,
              whatsapp: contact.whatsapp.trim() || null,
            })
          : Promise.resolve(null),
      ]);
      setProfile((prev) =>
        prev
          ? {
              ...updated,
              user: {
                ...updated.user,
                phone: contact.phone.trim() || null,
                whatsapp: contact.whatsapp.trim() || null,
              },
            }
          : updated,
      );
      setSaved(true);
    } catch (err) {
      setError(toActionableErrorMessage(err, 'Erreur lors de l’enregistrement.'));
    } finally {
      setSaving(false);
    }
  }, [
    activity.bio,
    city,
    contact.phone,
    contact.whatsapp,
    contactsDirty,
    experienceYearsNumber,
    matchedCity,
    skills.categories,
    skills.familyCodes,
    skills.specialties,
  ]);

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
      <PageHeader
        title="Mon profil"
        description="Votre fiche professionnelle : ce que les clients voient et ce qui détermine les missions qui vous sont proposées."
        backHref="/technicien"
      />

      <ProfilHero profile={profile} />

      {/* ── Identité ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader title="Identité" />
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Photo de profil</span>
              <span className="text-xs text-muted-foreground">Visible par les clients</span>
            </div>
            <div className="mt-3">
              <AvatarUpload
                avatarUrl={avatarUrl}
                onUpdated={(url) => {
                  setAvatarUrl(url);
                  setProfile((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
                }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Nom</span>
              <span>
                {profile.user.firstName} {profile.user.lastName ?? ''}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span className="truncate">{profile.user.email}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Votre nom et votre photo sont modifiables depuis votre compte. Votre date de naissance
              et votre pièce d’identité relèvent de la{' '}
              <Link href="/technicien/kyc" className="underline">
                vérification d’identité
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* ── Contact ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="Contact"
          description="Les coordonnées que les clients et Relio utilisent pour vous joindre."
        />
        <ContactSection values={contact} onChange={setContact} />
      </div>

      {/* ── Activité professionnelle ───────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="Activité professionnelle"
          description="Votre mode d’exercice, votre expérience et la présentation affichée sur votre profil public."
        />
        <ActivitySection values={activity} onChange={setActivity} />
      </div>

      {/* ── Compétences ────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="Compétences"
          description="Ce que vous savez réellement prendre en charge. C’est ce qui détermine les missions proposées."
        />
        <SkillsSection
          values={skills}
          onChange={setSkills}
          categories={REQUEST_CATEGORIES}
          families={families}
          familiesLoading={familiesLoading}
          categoriesError={familiesError}
        />
      </div>

      {/* ── Zones d'intervention ───────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="Zones d’intervention"
          description="Indiquez les zones de votre ville où vous souhaitez être pris en compte pour les nouvelles missions."
        />
        <Field
          label="Ville d’intervention"
          htmlFor="profil-ville"
          required
          hint={
            citiesError
              ? 'Villes indisponibles pour le moment — réessayez plus tard.'
              : profile.cityId && matchedCity
                ? `Rattachée au référentiel : ${matchedCity.name}.`
                : 'Choisissez votre ville dans le référentiel Relio.'
          }
          error={cityMismatch ? `« ${city.trim()} » ne figure pas au référentiel — sélectionnez une ville ci-dessous.` : null}
        >
          <Select
            id="profil-ville"
            value={matchedCity ? matchedCity.name : ''}
            onChange={(e) => setCity(e.target.value)}
            disabled={citiesLoading || cities.length === 0}
            required
          >
            <option value="">
              {citiesLoading ? 'Chargement des villes…' : 'Sélectionnez votre ville'}
            </option>
            {cities.map((candidate) => (
              <option key={candidate.id} value={candidate.name}>
                {candidate.name}
              </option>
            ))}
          </Select>
        </Field>
        <Link href="/technicien/zones" className="block">
          <Button variant="secondary" className="w-full" size="lg">
            Gérer mes zones couvertes
          </Button>
        </Link>
      </div>

      {/* ── KYC : statut + accès (le FORMULAIRE vit sur /technicien/kyc) ── */}
      <div className="space-y-4">
        <SectionHeader
          title="Vérification d’identité"
          description="Vérifiée manuellement par Relio. Obligatoire pour accepter des missions."
        />
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Identité</span>
            <Badge variant={kycVariantFor(profile.kycStatus)}>
              {kycStatusLabel(profile.kycStatus)}
            </Badge>
          </div>
          {profile.mustCompleteKycProfile ? (
            <Alert variant="warning" dense>
              Il vous manque votre date de naissance. Sans elle, Relio ne peut pas vérifier que vous
              avez au moins 18 ans : votre identité reste « non vérifiée » et vous ne pourrez pas
              accepter de missions. Complétez votre vérification.
            </Alert>
          ) : null}
          <Link href="/technicien/kyc" className="block">
            <Button variant="secondary" className="w-full">
              {profile.kycStatus === 'NOT_SUBMITTED' || profile.kycStatus === 'REJECTED'
                ? 'Compléter ma vérification'
                : 'Voir ma vérification'}
            </Button>
          </Link>
          <Link href={`/client/technicien/${profile.id}`} className="block">
            <Button variant="ghost" className="w-full">
              Voir mon profil public
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Compte ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader title="Notifications" />
        <PushNotificationCard />
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {saved ? <Alert variant="success" dense>Profil enregistré.</Alert> : null}
      {saving ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner size="sm" /> Enregistrement…
        </p>
      ) : null}

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