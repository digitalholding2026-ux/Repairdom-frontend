'use client';

/**
 * Page KYC technicien — parcours de vérification d'identité.
 *
 * PAGE DÉDIÉE (arbitrage §12/§24) : elle sort du profil professionnel, qui ne
 * porte plus que les informations de métier.
 *
 * Le parcours est affiché comme une timeline d'étapes (identité → document →
 * recto/verso → justificatif facultatif → vérification) afin que le technicien
 * sache toujours où il en est. L'animation est volontairement légère : un état
 * visuel par étape, aucune décoration lourde.
 *
 * Trois principes structurent cette page :
 *  - le dépôt d'un document ne transmet RIEN : seule la soumission explicite
 *    (validée côté backend sur la complétude) met le dossier en attente ;
 *  - les documents ne sont JAMAIS exposés publiquement : la prévisualisation
 *    passe par une URL signée éphémère (5 min) servie par le backend ;
 *  - la preuve professionnelle est FACULTATIVE : elle ne doit jamais bloquer un
 *    freelance qui n'a pas de document administratif.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import {
  deleteTechnicianKycDocument,
  getTechnicianKyc,
  getTechnicianKycDocumentUrl,
  getTechnicianProfile,
  submitTechnicianKyc,
  updateTechnicianProfile,
  uploadTechnicianKycDocument,
  type KycDocumentMetadata,
  type KycDocumentSide,
  type KycDocumentType,
  type KycIdentityDocumentType,
  type KycStatus,
  type TechnicianProfile,
} from '@/lib/api/technician-service';
import { listNationalities, type NationalityLite } from '@/lib/api/catalog-service';
import {
  IDENTITY_DOCUMENT_LABELS,
  identityDocumentLabel,
  kycDocumentSideLabel,
  kycIsLocked,
  kycStatusLabel,
  kycVariantFor,
  requiredIdentitySides,
} from '@/lib/technician-profile';
import { IdentitySection } from '@/components/technician/profil/profile-sections';
import { toActionableErrorMessage, toUserErrorMessage } from '@/lib/ui-error-message';

/* Formats alignés sur le backend (`kyc-file.ts`). */
const ACCEPTED_TYPES = 'application/pdf,image/jpeg,image/png,image/webp';
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Étapes du parcours, dans l'ordre où le technicien les rencontre. */
type StepKey = 'identity' | 'document' | 'documents' | 'professional' | 'submit';

const STEP_LABELS: Record<StepKey, string> = {
  identity: 'Identité',
  document: 'Document',
  documents: 'Photos du document',
  professional: 'Justificatif professionnel',
  submit: 'Vérification',
};

const STEP_DESCRIPTIONS: Record<StepKey, string> = {
  identity: 'Confirmez votre date de naissance et votre nationalité.',
  document: 'Indiquez la nature de la pièce que vous allez envoyer.',
  documents: 'Déposez chaque face demandée, puis vérifiez ce qui est envoyé.',
  professional: 'Facultatif — renforce votre dossier, ne bloque jamais l’accès.',
  submit: 'Relisez votre dossier avant de le transmettre à Relio.',
};

const ALL_STEPS: StepKey[] = ['identity', 'document', 'documents', 'professional', 'submit'];

export default function TechnicianKycPage() {
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [status, setStatus] = useState<KycStatus>('NOT_SUBMITTED');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KycDocumentMetadata[]>([]);

  const [nationalities, setNationalities] = useState<NationalityLite[]>([]);
  const [nationalitiesLoading, setNationalitiesLoading] = useState(true);
  const [nationalitiesError, setNationalitiesError] = useState<string | null>(null);

  const [birthDate, setBirthDate] = useState('');
  const [nationality, setNationality] = useState('');
  const [docType, setDocType] = useState<KycIdentityDocumentType | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [uploadingSide, setUploadingSide] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; mimeType: string } | null>(null);

  const identityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [p, k] = await Promise.all([getTechnicianProfile(), getTechnicianKyc()]);
        if (cancelled) return;
        setProfile(p);
        setStatus(k.status);
        setRejectionReason(k.kycRejectionReason);
        setDocuments(k.documents);
        setBirthDate(p.birthDate ?? '');
        setNationality(p.nationality ?? '');
        setDocType(p.kycIdentityDocType);
      } catch (err) {
        if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadNationalities() {
      try {
        const list = await listNationalities();
        if (!cancelled) {
          setNationalities(list);
          setNationalitiesError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setNationalitiesError(
            toUserErrorMessage(err, 'Liste des pays indisponible. Rechargez la page.'),
          );
        }
      } finally {
        if (!cancelled) setNationalitiesLoading(false);
      }
    }

    load();
    loadNationalities();
    return () => {
      cancelled = true;
      if (identityTimer.current) clearTimeout(identityTimer.current);
    };
  }, []);

  const locked = kycIsLocked(status);
  /* Dossier transmis ou validé : il n'y a plus d'action possible, la timeline
   * se termine. Tant que ce n'est pas le cas, toutes les étapes sont
   * affichées (la preuve pro reste proposée mais facultative). */
  const awaitingReview = status === 'PENDING' || locked;

  const identityDone = birthDate !== '' && nationality !== '';
  const requiredSides = useMemo(() => requiredIdentitySides(docType), [docType]);
  const identityDocs = useMemo(
    () => documents.filter((doc) => doc.type === 'IDENTITY'),
    [documents],
  );
  const documentsDone =
    docType !== null && requiredSides.every((side) => identityDocs.some((doc) => doc.side === side));
  const hasProfessionalProof = documents.some((doc) => doc.type === 'PROFESSIONAL');

  /* Étape courante : première étape non satisfaite. La preuve pro étant
   * facultative, elle n'est jamais bloquante (cf. §19). */
  const currentStep: StepKey = (() => {
    if (!identityDone) return 'identity';
    if (docType === null) return 'document';
    if (!documentsDone) return 'documents';
    if (!hasProfessionalProof && !awaitingReview) return 'professional';
    return 'submit';
  })();

  /* Dossier transmis/validé : `steps.length` marque la FIN (toutes étapes
   * faites). Sans cela, `indexOf` rendrait -1 et aucune étape n'apparaîtrait
   * comme terminée ni active. */
  const currentIndex = awaitingReview ? ALL_STEPS.length : ALL_STEPS.indexOf(currentStep);
  const canSubmit = identityDone && docType !== null && documentsDone;

  const applyOverview = useCallback((overview: { status: KycStatus; kycRejectionReason: string | null; documents: KycDocumentMetadata[] }) => {
    setStatus(overview.status);
    setRejectionReason(overview.kycRejectionReason);
    setDocuments(overview.documents);
  }, []);

  /* Les valeurs sont passées en ARGUMENT par l'appelant, jamais relues dans
   * une closure : le debounce serait sinon figé sur le rendu précédent et
   * n'enregistrerait pas la dernière frappe. */
  const persistIdentity = useCallback(
    async (payload: {
      birthDate: string | null;
      nationality: string | null;
      kycIdentityDocType?: KycIdentityDocumentType | null;
    }) => {
      setSavingIdentity(true);
      try {
        const updated = await updateTechnicianProfile(payload);
        setProfile(updated);
        setError(null);
        return updated;
      } catch (err) {
        setError(toActionableErrorMessage(err, 'Enregistrement impossible.'));
        return null;
      } finally {
        setSavingIdentity(false);
      }
    },
    [],
  );

  const scheduleIdentitySave = useCallback(
    (nextBirthDate: string, nextNationality: string) => {
      if (identityTimer.current) clearTimeout(identityTimer.current);
      identityTimer.current = setTimeout(() => {
        void persistIdentity({
          birthDate: nextBirthDate === '' ? null : nextBirthDate,
          nationality: nextNationality === '' ? null : nextNationality,
        });
      }, 600);
    },
    [persistIdentity],
  );

  const chooseDocType = async (value: KycIdentityDocumentType | '') => {
    const next = value === '' ? null : (value as KycIdentityDocumentType);
    setDocType(next);
    /* Changer de nature de pièce réévalue les faces attendues (CNI : recto +
     * verso ; passeport : une page). Les documents déjà déposés ne sont pas
     * effacés : le parcours affiche simplement ce qui reste à faire. */
    await persistIdentity({
      birthDate: birthDate === '' ? null : birthDate,
      nationality: nationality === '' ? null : nationality,
      kycIdentityDocType: next,
    });
  };

  const upload = async (file: File, side: KycDocumentSide, type: KycDocumentType = 'IDENTITY') => {
    setError(null);
    setNotice(null);
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError('Le fichier dépasse 10 Mo.');
      return;
    }
    setUploadingSide(`${type}:${side}`);
    try {
      /* Le dépôt ne change pas le statut : c'est `submit` qui transmet. */
      applyOverview(await uploadTechnicianKycDocument(file, type, side));
      setNotice('Document enregistré.');
    } catch (err) {
      setError(toActionableErrorMessage(err, 'Dépôt impossible.'));
    } finally {
      setUploadingSide(null);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    setNotice(null);
    try {
      applyOverview(await deleteTechnicianKycDocument(id));
      setNotice('Document supprimé.');
    } catch (err) {
      setError(toActionableErrorMessage(err, 'Suppression impossible.'));
    }
  };

  /* Prévisualisation : URL signée éphémère, jamais d'URL publique. */
  const openPreview = async (document: KycDocumentMetadata) => {
    setError(null);
    try {
      const { url, mimeType } = await getTechnicianKycDocumentUrl(document.id);
      setPreview({ url, mimeType });
    } catch (err) {
      setError(toActionableErrorMessage(err, 'Consultation impossible.'));
    }
  };

  const submit = async () => {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      applyOverview(await submitTechnicianKyc());
    } catch (err) {
      /* Le backend répond ici QUOI manque ou POURQUOI c'est refusé : ce texte
       * est le seul retour exploitable, on ne le masque pas derrière un
       * message générique. */
      setError(toActionableErrorMessage(err, 'Soumission impossible.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Vérification d’identité" backHref="/technicien/profil" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" /> Chargement…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vérification d’identité"
        description="Vérifiez votre identité une fois pour toutes, pour rassurer les clients et accéder aux missions."
        backHref="/technicien/profil"
      />

      {/* ── Progression ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium">État de la vérification</span>
          <Badge variant={kycVariantFor(status)}>{kycStatusLabel(status)}</Badge>
        </div>
        <ol className="space-y-2">
          {ALL_STEPS.map((step, index) => {
            const done = index < currentIndex;
            const active = index === currentIndex && !awaitingReview;
            return (
              <li
                key={step}
                className={`flex items-start gap-3 rounded-lg px-2 py-2 transition-colors ${
                  active ? 'bg-secondary' : ''
                }`}
                aria-current={active ? 'step' : undefined}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? 'bg-success text-success-foreground'
                      : active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{STEP_LABELS[step]}</span>
                  {active ? (
                    <span className="block text-xs text-muted-foreground">
                      {STEP_DESCRIPTIONS[step]}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
          {awaitingReview ? (
            <li className="flex items-start gap-3 rounded-lg bg-secondary px-2 py-2">
              <span
                aria-hidden
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
              >
                {locked ? '✓' : '…'}
              </span>
              <span>
                <span className="block text-sm font-medium">
                  {locked ? 'Identité vérifiée' : 'En attente'}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {locked
                    ? 'Relio a validé votre identité.'
                    : 'Relio vérifie votre dossier. Vous serez notifié de la décision.'}
                </span>
              </span>
            </li>
          ) : null}
        </ol>
      </div>

      {locked ? (
        <Alert variant="success">
          Votre identité est vérifiée. Vous pouvez accepter des missions et vous rendre disponible.
        </Alert>
      ) : null}
      {status === 'PENDING' ? (
        <Alert variant="info">
          Votre dossier a été transmis à Relio. Vous pouvez continuer à utiliser Relio normalement en
          attendant la vérification.
        </Alert>
      ) : null}
      {status === 'REJECTED' && rejectionReason ? (
        <Alert variant="error">
          <strong className="font-medium">Vérification à compléter :</strong> {rejectionReason}
        </Alert>
      ) : null}

      {/* ── 1. Identité ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="1. Identité"
          description="Ces informations servent uniquement à confirmer que vous êtes majeur et que votre identité correspond à votre pièce."
        />
        {locked ? (
          <Alert variant="success" dense>
            Identité vérifiée : ces informations ne sont plus modifiables.
          </Alert>
        ) : null}
        <IdentitySection
          values={{ birthDate, nationality }}
          onChange={(values) => {
            setBirthDate(values.birthDate);
            setNationality(values.nationality);
            scheduleIdentitySave(values.birthDate, values.nationality);
          }}
          nationalities={nationalities}
          nationalitiesLoading={nationalitiesLoading}
          nationalitiesError={nationalitiesError}
          disabled={locked}
        />
        {savingIdentity ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner size="sm" /> Enregistrement…
          </p>
        ) : null}
      </div>

      {/* ── 2. Nature du document ──────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="2. Document d’identité"
          description="Relio accepte deux pièces : carte nationale d’identité (recto + verso) ou passeport (une page)."
        />
        {locked ? (
          <Alert variant="success" dense>
            {identityDocumentLabel(profile?.kycIdentityDocType ?? null) ?? 'Pièce d’identité vérifiée'}
          </Alert>
        ) : (
          <Field label="Nature de votre pièce" htmlFor="kyc-doctype" required>
            <Select
              id="kyc-doctype"
              value={docType ?? ''}
              onChange={(e) => void chooseDocType(e.target.value as KycIdentityDocumentType | '')}
              required
            >
              <option value="">Sélectionnez votre pièce</option>
              {(Object.keys(IDENTITY_DOCUMENT_LABELS) as KycIdentityDocumentType[]).map((key) => (
                <option key={key} value={key}>
                  {IDENTITY_DOCUMENT_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <p className="text-xs text-muted-foreground">
          Formats acceptés : PDF, JPG, PNG ou WEBP. 10 Mo maximum par document. Assurez-vous que le
          document est bien lisible et entièrement visible.
        </p>
      </div>

      {/* ── 3. Recto / verso ───────────────────────────────────────────── */}
      {docType !== null ? (
        <div className="space-y-4">
          <SectionHeader
            title="3. Photos du document"
            description={
              requiredSides.length > 1
                ? 'Votre carte nationale d’identité a deux faces : recto et verso, tous deux obligatoires.'
                : 'Votre document ne comporte qu’une page : un seul dépôt est nécessaire.'
            }
          />

          {requiredSides.map((side) => {
            const existing = identityDocs.find((doc) => doc.side === side);
            const busy = uploadingSide === `IDENTITY:${side}`;
            return (
              <div key={side} className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{kycDocumentSideLabel(side)}</span>
                  {existing ? (
                    <Badge variant="success">Reçu</Badge>
                  ) : (
                    <Badge variant="warning">Manquant</Badge>
                  )}
                </div>
                {existing ? (
                  <>
                    <p className="text-xs text-muted-foreground">{existing.originalName}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void openPreview(existing)}
                      >
                        Consulter
                      </Button>
                      {!locked ? (
                        <label>
                          <span className="sr-only">
                            Remplacer le {kycDocumentSideLabel(side).toLowerCase()}
                          </span>
                          <input
                            type="file"
                            accept={ACCEPTED_TYPES}
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) void upload(file, side);
                            }}
                          />
                          <span className="inline-flex cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                            Remplacer
                          </span>
                        </label>
                      ) : null}
                      {!locked ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-error-ink hover:bg-error-soft"
                          onClick={() => void remove(existing.id)}
                        >
                          Supprimer
                        </Button>
                      ) : null}
                    </div>
                  </>
                ) : locked ? (
                  <p className="text-xs text-muted-foreground">Document non transmis.</p>
                ) : (
                  <label>
                    <span className="sr-only">
                      Déposer le {kycDocumentSideLabel(side).toLowerCase()}
                    </span>
                    <input
                      type="file"
                      accept={ACCEPTED_TYPES}
                      className="sr-only"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) void upload(file, side);
                      }}
                    />
                    <span className="inline-flex cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                      {busy ? 'Envoi en cours…' : 'Choisir un fichier'}
                    </span>
                  </label>
                )}
                {busy ? (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Spinner size="sm" /> Téléversement…
                  </p>
                ) : null}
              </div>
            );
          })}

          {preview ? (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Aperçu de votre document</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  Fermer
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce lien est temporaire et réservé à vous. Ne le partagez pas.
              </p>
              {preview.mimeType.startsWith('image/') ? (
                /* URL signée de largeur inconnue : next/image n'apporte rien
                   ici et imposerait un loader sur un document privé. */
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt="Aperçu du document"
                  className="max-h-96 w-auto rounded-lg"
                />
              ) : (
                <a href={preview.url} target="_blank" rel="noreferrer" className="text-sm underline">
                  Ouvrir le document
                </a>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── 4. Preuve professionnelle (FACULTATIVE, §19) ──────────────── */}
      {!locked ? (
        <div className="space-y-4">
          <SectionHeader
            title="4. Justificatif professionnel (facultatif)"
            description="Si vous en disposez : attestation de formation, diplôme, carte professionnelle, document d’enregistrement… Cela renforce votre dossier, mais n’est jamais exigé pour travailler sur Relio."
          />
          {documents
            .filter((doc) => doc.type === 'PROFESSIONAL')
            .map((doc) => (
              <div
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <span className="text-sm">{doc.originalName}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void openPreview(doc)}
                  >
                    Consulter
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-error-ink hover:bg-error-soft"
                    onClick={() => void remove(doc.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          {!hasProfessionalProof ? (
            <label>
              <span className="sr-only">Déposer un justificatif professionnel</span>
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                className="sr-only"
                disabled={uploadingSide === 'PROFESSIONAL:SINGLE'}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void upload(file, 'SINGLE', 'PROFESSIONAL');
                }}
              />
              <span className="inline-flex cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                {uploadingSide === 'PROFESSIONAL:SINGLE'
                  ? 'Envoi en cours…'
                  : 'Ajouter un justificatif (facultatif)'}
              </span>
            </label>
          ) : null}
        </div>
      ) : null}

      {/* ── 5. Transmission ─────────────────────────────────────────────── */}
      {!awaitingReview ? (
        <div className="space-y-4">
          <SectionHeader
            title="5. Transmission à Relio"
            description="Votre dossier sera transmis à l’équipe Relio, qui le vérifie manuellement."
          />
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Date de naissance</span>
              <span>{identityDone ? birthDate : 'Non renseignée'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Nationalité</span>
              <span>
                {nationalities.find((entry) => entry.code === nationality)?.label ?? 'Non renseignée'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Pièce d’identité</span>
              <span>{identityDocumentLabel(docType) ?? 'Non déclarée'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Documents reçus</span>
              <span>
                {identityDocs.length > 0
                  ? identityDocs.map((doc) => kycDocumentSideLabel(doc.side)).join(', ')
                  : 'Aucun'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Justificatif professionnel</span>
              <span>{hasProfessionalProof ? 'Fourni (facultatif)' : 'Non fourni'}</span>
            </div>
          </div>
          <Button
            onClick={submit}
            isLoading={submitting}
            disabled={!canSubmit}
            className="w-full"
            size="lg"
          >
            {status === 'REJECTED' ? 'Renvoyer mon dossier' : 'Transmettre mon dossier'}
          </Button>
          {!canSubmit ? (
            <p className="text-xs text-muted-foreground">
              Complétez les étapes précédentes avant de transmettre : Relio ne peut vérifier que ce
              qui est fourni.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? (
        <Alert variant="success" dense>
          {notice}
        </Alert>
      ) : null}

      <Link href="/technicien/profil" className="block">
        <Button variant="secondary" className="w-full">
          Retour à mon profil
        </Button>
      </Link>
    </div>
  );
}