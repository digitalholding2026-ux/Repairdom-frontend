'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Avatar } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { Icon } from '@/components/ui/icon';
import {
  getMe,
  homePathForRole,
  updateMe,
  uploadClientAvatar,
  type AuthUser,
} from '@/lib/api/auth-service';
import { listCities, type City } from '@/lib/api/cities-service';
import { Select } from '@/components/ui/select';

export default function ClientProfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMe(), listCities()])
      .then(([me, c]) => {
        if (cancelled) return;
        if (me.role !== 'CLIENT') {
          router.replace(homePathForRole(me.role));
          return;
        }
        setUser(me);
        setCities(c);
        setFirstName(me.firstName ?? '');
        setLastName(me.lastName ?? '');
        setPhone(me.phone ?? '');
        setWhatsapp(me.whatsapp ?? '');
        setCity(me.city ?? '');
        setAddress(me.address ?? '');
      })
      .catch(() => router.replace('/client/connexion'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateMe({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        city: city || null,
        address: address.trim() || null,
      });
      setUser(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      const updated = await uploadClientAvatar(files[0]);
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\u2019upload de la photo.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Mon profil" description="Gérez vos informations personnelles." backHref="/client" />

      <div className="flex items-center gap-4">
        <Avatar
          size="xl"
          firstName={user.firstName ?? ''}
          lastName={user.lastName}
          src={user.avatarUrl ?? undefined}
        />
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50">
            <Icon name="settings" size="sm" />
            Modifier la photo
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleAvatar(e.target.files)}
            />
          </label>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WEBP – max 5 Mo</p>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Prénom" htmlFor="profil-firstName" required>
          <Input id="profil-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </Field>
        <Field label="Nom" htmlFor="profil-lastName" required>
          <Input id="profil-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="profil-email">
          <Input id="profil-email" value={user.email} disabled className="opacity-60" />
        </Field>
        <Field label="Téléphone" htmlFor="profil-phone">
          <Input id="profil-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
        </Field>
        <Field label="WhatsApp" htmlFor="profil-whatsapp" hint="WhatsApp de préférence">
          <Input id="profil-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" />
        </Field>
        <Field label="Ville" htmlFor="profil-city">
          <Select id="profil-city" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Sélectionnez votre ville</option>
            {cities.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Adresse précise" htmlFor="profil-address">
          <Input id="profil-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {saved ? <Alert variant="success" dense>Profil mis à jour.</Alert> : null}

      <Button onClick={handleSave} className="w-full" size="lg" isLoading={saving} disabled={!firstName.trim()}>
        Enregistrer les modifications
      </Button>

      <Link href="/client" className="block">
        <Button variant="secondary" className="w-full">
          Retour à l&apos;accueil
        </Button>
      </Link>
    </div>
  );
}