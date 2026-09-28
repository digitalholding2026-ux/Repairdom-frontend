'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { uploadClientAvatar, type AuthUser } from '@/lib/api/auth-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

interface ProfilHeroProps {
  user: AuthUser;
  onUpdated: (user: AuthUser) => void;
}

/* Carte identité condensée : avatar modifiable (upload intégré) +
 * nom, email et badge de statut, en une seule rangée horizontale. */
export function ProfilHero({ user, onUpdated }: ProfilHeroProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Mon profil';

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
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
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors de l\u2019envoi de la photo.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      aria-label="Identité du profil"
      className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-white shadow-lg"
    >
      <div className="relative shrink-0">
        <Avatar
          src={user.avatarUrl}
          firstName={user.firstName}
          lastName={user.lastName}
          size="xl"
          alt="Photo de profil"
          className="relative overflow-hidden rounded-full shadow-md ring-2 ring-orange-500"
        />
        <button
          type="button"
          aria-label="Modifier la photo de profil"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
            className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-white/40 bg-orange-500/90 text-white shadow transition hover:bg-orange-500 disabled:opacity-60"
        >
          <Icon name="camera" size="3.5" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      <div className="min-w-0 flex-1">
        {/* La page porte déjà le h1 (« Mon profil ») — le nom reste en h2. */}
        <h2 className="truncate text-lg font-bold leading-tight">{fullName}</h2>
        <p className="truncate text-xs text-white/70">{user.email}</p>
        <div className="mt-1.5">
          {user.emailVerified ? (
            <Badge variant="success" className="gap-1 text-2xs">
              <Icon name="check-circle" size="3.5" />
              Email vérifié
            </Badge>
          ) : (
            <Link
              href="/client/verification"
              className="inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white transition hover:bg-white/25"
            >
              Vérifier mon email
            </Link>
          )}
        </div>
        {error ? (
          <p role="alert" className="mt-1 text-xs font-medium text-red-300">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
