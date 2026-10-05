'use client';

/* Composants partagés par le profil et la page KYC.
 *
 * Factorisés ici parce que les deux pagesAffichent exactement les mêmes
 * notions (identité, contact, activité, compétences). Une seule implémentation
 * = pas de divergence entre les deux écrans. */

import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/cn';
import {
  ACTIVITY_TYPE_LABELS,
  MINIMUM_AGE_ERROR,
  computeAge,
  meetsMinimumAge,
} from '@/lib/technician-profile';
import type { TechnicianActivityType } from '@/lib/api/technician-service';
import type { EquipmentFamilyLite } from '@/lib/api/catalog-service';

/** Longueurs alignées sur les contraintes backend (`UpdateTechnicianProfileDto`). */
export const BIO_MAX_LENGTH = 600;
export const SPECIALTIES_MAX_ITEMS = 20;
export const MIN_EXPERIENCE_YEARS = 0;
export const MAX_EXPERIENCE_YEARS = 70;
export const WHATSAPP_HINT =
  'Si votre numéro d’appel et votre numéro WhatsApp sont identiques, saisissez simplement le même numéro dans les deux champs.';

/* ── Identité ───────────────────────────────────────────────────────────── */

export interface ContactValues {
  phone: string;
  whatsapp: string;
}

export interface ContactSectionProps {
  values: ContactValues;
  onChange: (values: ContactValues) => void;
  /** Les deux numéros sont facultatifs mais DOIVENT être enregistrés (§6). */
  hint?: string;
}

export function ContactSection({ values, onChange, hint }: ContactSectionProps) {
  return (
    <div className="space-y-4">
      <Field
        label="Numéro d’appel"
        htmlFor="contact-phone"
        hint="Le numéro que les clients et Relio utilisent pour vous appeler."
      >
        <Input
          id="contact-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={(e) => onChange({ ...values, phone: e.target.value })}
          placeholder="+237 6 00 00 00 00"
        />
      </Field>
      <Field label="Numéro WhatsApp" htmlFor="contact-whatsapp" hint={hint ?? WHATSAPP_HINT}>
        <Input
          id="contact-whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.whatsapp}
          onChange={(e) => onChange({ ...values, whatsapp: e.target.value })}
          placeholder="+237 6 00 00 00 00"
        />
      </Field>
    </div>
  );
}

/* ── Activité professionnelle ───────────────────────────────────────────── */

export interface ActivityValues {
  activityType: TechnicianActivityType | null;
  experienceYears: string;
  bio: string;
}

export interface ActivitySectionProps {
  values: ActivityValues;
  onChange: (values: ActivityValues) => void;
}

export function ActivitySection({ values, onChange }: ActivitySectionProps) {
  const years = values.experienceYears === '' ? null : Number(values.experienceYears);
  const yearsInvalid =
    values.experienceYears !== '' &&
    (years === null ||
      !Number.isInteger(years) ||
      years < MIN_EXPERIENCE_YEARS ||
      years > MAX_EXPERIENCE_YEARS);

  return (
    <div className="space-y-4">
      <Field
        label="Type d’activité"
        htmlFor="activity-type"
        hint="Indique comment vous exercez : cela aide le client et le dispatch à vous orienter les bonnes missions."
      >
        <Select
          id="activity-type"
          value={values.activityType ?? ''}
          onChange={(e) =>
            onChange({
              ...values,
              activityType: e.target.value === '' ? null : (e.target.value as TechnicianActivityType),
            })
          }
        >
          <option value="">Sélectionnez votre statut</option>
          {(Object.keys(ACTIVITY_TYPE_LABELS) as TechnicianActivityType[]).map((key) => (
            <option key={key} value={key}>
              {ACTIVITY_TYPE_LABELS[key]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Années d’expérience"
        htmlFor="activity-years"
        hint="Nombre d’années d’expérience en réparation. Donne une indication fiable, au-delà d’un récit."
        error={yearsInvalid ? `Indiquez un nombre entre 0 et ${MAX_EXPERIENCE_YEARS}.` : null}
      >
        <Input
          id="activity-years"
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_EXPERIENCE_YEARS}
          value={values.experienceYears}
          onChange={(e) => onChange({ ...values, experienceYears: e.target.value })}
          placeholder="Ex. : 5"
        />
      </Field>

      <Field
        label="Bio professionnelle"
        htmlFor="activity-bio"
        hint={`Présentation courte affichée sur votre profil public (${values.bio.length}/${BIO_MAX_LENGTH}).`}
        error={values.bio.length > BIO_MAX_LENGTH ? `Maximum ${BIO_MAX_LENGTH} caractères.` : null}
      >
        <Textarea
          id="activity-bio"
          value={values.bio}
          onChange={(e) => onChange({ ...values, bio: e.target.value })}
          placeholder="Technicien spécialisé dans la réparation de smartphones et ordinateurs, avec plusieurs années d’expérience dans le diagnostic matériel et logiciel."
          rows={4}
          maxLength={BIO_MAX_LENGTH}
        />
      </Field>
    </div>
  );
}

/* ── Compétences ────────────────────────────────────────────────────────── */

export interface SkillsValues {
  categories: string[];
  familyCodes: string[];
  specialties: string;
}

export interface SkillsSectionProps {
  values: SkillsValues;
  onChange: (values: SkillsValues) => void;
  categories: Array<{ id: string; label: string }>;
  families: EquipmentFamilyLite[];
  familiesLoading?: boolean;
  categoriesError?: string | null;
}

/** Grille de cases à cocher (catégories ET familles partagent le rendu). */
function ToggleGrid({
  options,
  selected,
  onToggle,
  ariaLabel,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div className="grid gap-2" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={isSelected}
            onClick={() => onToggle(option.value)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'border-primary bg-secondary text-secondary-foreground'
                : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            <span className="block text-sm font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SkillsSection({
  values,
  onChange,
  categories,
  families,
  familiesLoading,
  categoriesError,
}: SkillsSectionProps) {
  const specialties = values.specialties
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const toggle = (key: 'categories' | 'familyCodes', value: string) => {
    const current = values[key];
    onChange({
      ...values,
      [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <span className="mb-1.5 block text-sm font-medium">
          Catégories d’appareils <span className="ml-0.5 text-error" aria-hidden>*</span>
        </span>
        <p className="mb-2 text-xs text-muted-foreground">
          Le niveau principal de compétence : c’est lui qui détermine quelles demandes vous sont
          proposées.
        </p>
        <ToggleGrid
          options={categories.map((c) => ({ value: c.id, label: c.label }))}
          selected={values.categories}
          onToggle={(value) => toggle('categories', value)}
          ariaLabel="Catégories d’appareils maîtrisées"
        />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Types d’équipements</span>
        <p className="mb-2 text-xs text-muted-foreground">
          Spécialisations fines. Si le client a choisi un type précis (console, tablette, console de
          salon…), seules vos familles correspondantes seront retenues.
        </p>
        {categoriesError ? (
          <Alert variant="error" dense>
            {categoriesError}
          </Alert>
        ) : familiesLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des familles…</p>
        ) : families.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune famille d’équipement n’est configurée pour le moment.
          </p>
        ) : (
          <ToggleGrid
            options={families.map((family) => ({ value: family.code, label: family.label }))}
            selected={values.familyCodes}
            onToggle={(value) => toggle('familyCodes', value)}
            ariaLabel="Types d’équipements maîtrisés"
          />
        )}
        {values.familyCodes.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Aucune sélection : vous recevrez toutes les demandes de vos catégories. Choisissez-en
            pour être appelé uniquement sur ces équipements.
          </p>
        ) : null}
      </div>

      <Field
        label="Spécialités"
        htmlFor="skills-specialties"
        hint={`Séparées par des virgules (marque, panne courante, méthode…). Maximum ${SPECIALTIES_MAX_ITEMS}.`}
        error={
          specialties.length > SPECIALTIES_MAX_ITEMS
            ? `Maximum ${SPECIALTIES_MAX_ITEMS} spécialités.`
            : null
        }
      >
        <Input
          id="skills-specialties"
          value={values.specialties}
          onChange={(e) => onChange({ ...values, specialties: e.target.value })}
          placeholder="Ex. : smartphones, remplacement d’écran, carte mère"
          maxLength={400}
        />
      </Field>
    </div>
  );
}

/* ── Identité KYC (réutilisée par la page KYC et par le profil) ─────────── */

export interface IdentityValues {
  birthDate: string;
  nationality: string;
}

export interface IdentitySectionProps {
  values: IdentityValues;
  onChange: (values: IdentityValues) => void;
  nationalities: Array<{ code: string; label: string }>;
  nationalitiesLoading?: boolean;
  nationalitiesError?: string | null;
  /** `true` quand le dossier est verrouillé (KYC validé). */
  disabled?: boolean;
}

export function IdentitySection({
  values,
  onChange,
  nationalities,
  nationalitiesLoading,
  nationalitiesError,
  disabled,
}: IdentitySectionProps) {
  const age = computeAge(values.birthDate);
  /* N'affiche une alerte que si une date EST saisie et qu'elle est mineure :
     un champ vide est traité par la page KYC (« dossier incomplet »). */
  const tooYoung = values.birthDate !== '' && !meetsMinimumAge(values.birthDate);

  return (
    <div className="space-y-4">
      <Field
        label="Date de naissance"
        htmlFor="identity-birthdate"
        required
        hint="Obligatoire : Relio doit vérifier que vous avez au moins 18 ans pour exercer."
        error={tooYoung ? MINIMUM_AGE_ERROR : null}
      >
        <Input
          id="identity-birthdate"
          type="date"
          value={values.birthDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => onChange({ ...values, birthDate: e.target.value })}
          disabled={disabled}
          required
        />
      </Field>
      {age !== null && !tooYoung ? (
        <p className="-mt-2 text-xs text-muted-foreground">Vous avez {age} ans.</p>
      ) : null}

      <Field
        label="Nationalité"
        htmlFor="identity-nationality"
        required
        hint="Liste officielle des pays (ISO 3166-1). Utilisée pour la vérification d’identité."
      >
        <Select
          id="identity-nationality"
          value={values.nationality}
          onChange={(e) => onChange({ ...values, nationality: e.target.value })}
          disabled={disabled || nationalitiesLoading || nationalitiesError !== null}
          required
        >
          <option value="">
            {nationalitiesLoading
              ? 'Chargement…'
              : nationalitiesError
                ? 'Pays indisponibles'
                : 'Sélectionnez votre nationalité'}
          </option>
          {nationalities.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.label}
            </option>
          ))}
        </Select>
      </Field>
      {nationalitiesError ? (
        <Alert variant="error" dense>
          {nationalitiesError}
        </Alert>
      ) : null}
    </div>
  );
}

