'use client';

import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  uploadTechnicianKycDocument,
  deleteTechnicianKycDocument,
  type TechnicianKycOverview,
} from '@/lib/api/technician-service';
import { kycStatusLabel, kycVariantFor, kycDocumentTypeLabel } from '@/lib/technician-profile';
import { formatDate } from '@/lib/format';
import { toUserErrorMessage } from '@/lib/ui-error-message';

const ALLOWED_KYC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_KYC_SIZE = 10 * 1024 * 1024;

interface KycSectionProps {
  kyc: TechnicianKycOverview;
  onUpdated: (kyc: TechnicianKycOverview) => void;
}

export function KycSection({ kyc, onUpdated }: KycSectionProps) {
  const identityInputRef = useRef<HTMLInputElement>(null);
  const professionalInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFile = async (type: string, file: File) => {
    setError(null);
    setSuccess(null);
    if (!ALLOWED_KYC_TYPES.includes(file.type)) {
      setError('Format non supporté. Formats acceptés : PDF, JPG, PNG, WEBP.');
      return;
    }
    if (file.size > MAX_KYC_SIZE) {
      setError('Le fichier dépasse 10 Mo.');
      return;
    }
    setUploadingType(type);
    try {
      const overview = await uploadTechnicianKycDocument(file, type);
      onUpdated(overview);
      setSuccess(`${file.name} a bien été envoyé.`);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors de l\u2019envoi du document.'));
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setSuccess(null);
    setDeletingId(id);
    try {
      const overview = await deleteTechnicianKycDocument(id);
      onUpdated(overview);
      setSuccess('Document retiré.');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors de la suppression.'));
    } finally {
      setDeletingId(null);
    }
  };

  const pickFile = (type: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void handleFile(type, file);
  };

  return (
    <div>
      <Badge variant={kycVariantFor(kyc.status)}>{kycStatusLabel(kyc.status)}</Badge>

      <p className="mt-2 text-sm text-muted-foreground">
        {kyc.status === 'NOT_SUBMITTED'
          ? 'Votre identité n\u2019est pas encore vérifiée. Envoyez vos justificatifs pour permettre à Relio de vérifier votre profil.'
          : kyc.status === 'PENDING'
            ? 'Votre dossier est en cours de vérification par Relio.'
            : kyc.status === 'VERIFIED'
              ? 'Profil vérifié par Relio.'
              : 'Votre dossier a été rejeté.'}
      </p>

      {kyc.status === 'REJECTED' && kyc.kycRejectionReason ? (
        <Alert variant="warning" title="Motif du rejet" className="mt-3">
          {kyc.kycRejectionReason}
        </Alert>
      ) : null}

      {kyc.documents.length > 0 ? (
        <div className="mt-4 space-y-2">
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
                    Conservé par Relio
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(document.id)}
                    disabled={deletingId === document.id || uploadingType !== null}
                    className="shrink-0"
                  >
                    {deletingId === document.id ? 'Suppression…' : 'Retirer'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {kyc.status === 'VERIFIED' ? null : !showForm ? (
        <Button
          className="mt-4 w-full"
          onClick={() => setShowForm(true)}
          disabled={uploadingType !== null}
        >
          {kyc.status === 'NOT_SUBMITTED'
            ? 'Commencer la vérification'
            : kyc.status === 'REJECTED'
              ? 'Soumettre à nouveau'
              : 'Ajouter un document'}
        </Button>
      ) : (
        <div className="mt-4 space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Envoyer un justificatif</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Pièce d'identité</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · 10 Mo max.</p>
              </div>
              <input
                ref={identityInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => pickFile('IDENTITY', e)}
              />
              {uploadingType === 'IDENTITY' ? (
                <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <Spinner size="sm" /> Envoi…
                </span>
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
                onChange={(e) => pickFile('PROFESSIONAL', e)}
              />
              {uploadingType === 'PROFESSIONAL' ? (
                <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <Spinner size="sm" /> Envoi…
                </span>
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

      {error ? <Alert variant="error" dense className="mt-3">{error}</Alert> : null}
      {success ? <Alert variant="success" dense className="mt-3">{success}</Alert> : null}
    </div>
  );
}