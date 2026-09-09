'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/cn';
import { REQUEST_CATEGORIES } from '@/lib/data/request-categories';
import {
  getTechnicianProfile,
  updateTechnicianProfile,
  uploadTechnicianAvatar,
  getTechnicianKyc,
  uploadTechnicianKycDocument,
  deleteTechnicianKycDocument,
  type TechnicianProfile,
  type TechnicianKycOverview,
} from '@/lib/api/technician-service';
import {
  kycStatusLabel,
  kycVariantFor,
  kycDocumentTypeLabel,
} from '@/lib/technician-profile';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

const ALLOWED_KYC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_KYC_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
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

  const [kyc, setKyc] = useState<TechnicianKycOverview | null>(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycSuccess, setKycSuccess] = useState<string | null>(null);
  const [showKycForm, setShowKycForm] = useState(false);
  const [uploadingKycType, setUploadingKycType] = useState<string | null>(null);
  const [deletingKycId, setDeletingKycId] = useState<string | null>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);
  const professionalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [p, k] = await Promise.all([getTechnicianProfile(), getTechnicianKyc()]);
        if (cancelled) return;
        setProfile(p);
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
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
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

  const handleKycFileChange = async (type: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setKycError(null);
    setKycSuccess(null);

    if (!ALLOWED_KYC_TYPES.includes(file.type)) {
      setKycError('Format non supporté. Formats acceptés : PDF, JPG, PNG, WEBP.');
      return;
    }
    if (file.size > MAX_KYC_SIZE) {
      setKycError('Le fichier dépasse 10 Mo.');
      return;
    }

    setUploadingKycType(type);
    try {
      const overview = await uploadTechnicianKycDocument(file, type);
      setKyc(overview);
      setKycSuccess(`${file.name} a bien été envoyé.`);
    } catch (err) {
      setKycError(err instanceof Error ? err.message : 'Erreur lors de l’envoi du document.');
    } finally {
      setUploadingKycType(null);
    }
  };

  const handleKycDelete = async (id: string) => {
    if (!kyc) return;
    setKycError(null);
    setKycSuccess(null);
    setDeletingKycId(id);
    try {
      const overview = await deleteTechnicianKycDocument(id);
      setKyc(overview);
      setKycSuccess('Document retiré.');
    } catch (err) {
      setKycError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    } finally {
      setDeletingKycId(null);
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
        <Alert variant="error">{error}</Alert>
        <Link href="/technicien">
          <Button variant="secondary">Retour au tableau de bord</Button>
        </Link>
      </div>
    );
  }

  const currentAvatar = profile.avatarUrl;

  return (
    <div className="space-y-4">
      <Link
        href="/technicien"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <Icon name="arrow-left" size="sm" />
        Retour au tableau de bord
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
            <Avatar
              src={currentAvatar}
              firstName={profile.user.firstName}
              lastName={profile.user.lastName}
              size="xl"
              alt="Photo de profil"
            />
            <div className="flex-1 space-y-2"><input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
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
              {photoUploaded ? <Alert variant="success" dense>Photo mise à jour.</Alert> : null}
              {uploadError ? <Alert variant="error" dense>{uploadError}</Alert> : null}
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

          {error ? <Alert variant="error">{error}</Alert> : null}

          {saved ? <Alert variant="success">Profil enregistré.</Alert> : null}

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vérification de votre profil</CardTitle>
          <CardDescription>RepairDom vérifie manuellement votre identité.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {kycLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" /> Chargement…
            </div>
          ) : kyc ? (
            <>
              <div>
                <Badge variant={kycVariantFor(kyc.status)}>{kycStatusLabel(kyc.status)}</Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                {kyc.status === 'NOT_SUBMITTED'
                  ? 'Votre identité n’est pas encore vérifiée. Envoyez vos justificatifs pour permettre à RepairDom de vérifier votre profil.'
                  : kyc.status === 'PENDING'
                    ? 'Votre dossier est en cours de vérification par RepairDom.'
                    : kyc.status === 'VERIFIED'
                      ? 'Profil vérifié par RepairDom.'
                      : 'Votre dossier a été rejeté.'}
              </p>

              {kyc.status === 'REJECTED' && kyc.kycRejectionReason ? (
                <Alert variant="warning" title="Motif du rejet">
                  {kyc.kycRejectionReason}
                </Alert>
              ) : null}

              {kyc.documents.length > 0 ? (
                <div className="space-y-2">
                  <span className="block text-sm font-medium">Documents envoyés</span>
                  <ul className="space-y-2">
                    {kyc.documents.map((document) => (
                      <li
                        key={document.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {kycDocumentTypeLabel(document.type)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {document.originalName} · {formatDate(document.createdAt)}
                          </p>
                        </div>
                        {kyc.status === 'VERIFIED' ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            Conservé par RepairDom
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleKycDelete(document.id)}
                            disabled={deletingKycId === document.id || uploadingKycType !== null}
                            className="shrink-0"
                          >
                            {deletingKycId === document.id ? 'Suppression…' : 'Retirer'}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {kyc.status === 'VERIFIED' ? null : !showKycForm ? (
                <Button className="w-full" onClick={() => setShowKycForm(true)} disabled={uploadingKycType !== null}>
                  {kyc.status === 'NOT_SUBMITTED'
                    ? 'Commencer la vérification'
                    : kyc.status === 'REJECTED'
                      ? 'Soumettre à nouveau'
                      : 'Ajouter un document'}
                </Button>
              ) : (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <p className="text-sm font-medium">Envoyer un justificatif</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Pièce d’identité</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · 10 Mo max.</p>
                      </div>
                      <input
                        ref={identityInputRef}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => handleKycFileChange('IDENTITY', event)}
                      />
                      {uploadingKycType === 'IDENTITY' ? (
                        <span className="shrink-0 text-sm text-muted-foreground">Envoi…</span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={() => identityInputRef.current?.click()}
                        >
                          Choisir un fichier
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">Justificatif professionnel</p>
                        <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · 10 Mo max.</p>
                      </div>
                      <input
                        ref={professionalInputRef}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => handleKycFileChange('PROFESSIONAL', event)}
                      />
                      {uploadingKycType === 'PROFESSIONAL' ? (
                        <span className="shrink-0 text-sm text-muted-foreground">Envoi…</span>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="shrink-0"
                          onClick={() => professionalInputRef.current?.click()}
                        >
                          Choisir un fichier
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {kycError ? <Alert variant="error" dense>{kycError}</Alert> : null}
              {kycSuccess ? <Alert variant="success" dense>{kycSuccess}</Alert> : null}
            </>
          ) : (
            <Alert variant="error">{kycError ?? 'Impossible de charger votre dossier.'}</Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}