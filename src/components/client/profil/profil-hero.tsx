'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { GradientHeroCard } from '@/components/ui/gradient-hero-card';
import { uploadClientAvatar, type AuthUser } from '@/lib/api/auth-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

interface ProfilHeroProps {
  user: AuthUser;
  onUpdated: (user: AuthUser) => void;
}

/* Héros de profil : avatar large avec upload intégré (overlay caméra +
 * bouton), identité et badges de statut. */
export function ProfilHero({ user, onUpdated }: ProfilHeroProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Mon profil';
  const memberYear = user.createdAt ? new Date(user.createdAt).getFullYear() : null;

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
    <GradientHeroCard tone="brand">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative shrink-0 self-start">
          <Avatar
            src={user.avatarUrl}
            firstName={user.firstName}
            lastName={user.lastName}
            size="2xl"
            alt="Photo de profil"
            className="shadow-float ring-2 ring-white/40"
          />
          <button
            type="button"
            aria-label="Modifier la photo de profil"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border border-white/40 bg-white/25 text-white backdrop-blur-md transition hover:bg-white/35 disabled:opacity-60"
          >
            <Icon name="camera" size="sm" />
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
          <h2 className="truncate text-2xl font-bold text-white">{fullName}</h2>
          <p className="truncate text-sm text-white/70">{user.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {user.emailVerified ? (
              <Badge variant="success" className="gap-1">
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
            {memberYear && Number.isFinite(memberYear) ? (
              <Badge variant="outline" className="border-white/40 text-white">
                Membre depuis {memberYear}
              </Badge>
            ) : null}
          </div>
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => inputRef.current?.click()}
              isLoading={uploading}
              className="border border-white/30 bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
            >
              <Icon name="camera" size="sm" />
              Modifier la photo
            </Button>
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-xs font-medium text-white">
              {error}
            </p>
          ) : (
            <p className="mt-2 text-xs text-white/60">JPG, PNG ou WEBP · 5 Mo maximum.</p>
          )}
        </div>
      </div>
    </GradientHeroCard>
  );
}
