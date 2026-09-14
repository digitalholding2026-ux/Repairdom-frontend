'use client';

import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { uploadClientAvatar } from '@/lib/api/auth-service';
import type { AuthUser } from '@/lib/api/auth-service';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

interface AvatarUploadProps {
  user: AuthUser;
  onUpdated: (user: AuthUser) => void;
}

export function AvatarUpload({ user, onUpdated }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    setSuccess(false);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Format non supporté. Choisissez une image JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Le fichier dépasse 5 Mo.');
      return;
    }

    setUploading(true);
    try {
      const updated = await uploadClientAvatar(file);
      onUpdated(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l\u2019envoi de la photo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      {uploading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          <span>Envoi de la photo…</span>
        </div>
      ) : (
        <Button
          type="button"
          variant={user.avatarUrl ? 'secondary' : 'primary'}
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          {user.avatarUrl ? 'Modifier la photo' : 'Ajouter une photo'}
        </Button>
      )}
      {!uploading && !error && !success ? (
        <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP · 5 Mo maximum.</p>
      ) : null}
      {success ? <Alert variant="success" dense>Photo mise à jour.</Alert> : null}
      {error ? <Alert variant="error" dense>{error}</Alert> : null}
    </div>
  );
}
