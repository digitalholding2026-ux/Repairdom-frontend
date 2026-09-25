'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { ProfilHero } from '@/components/client/profil/profil-hero';
import { AvatarUpload } from '@/components/client/profil/avatar-upload';
import { ProfilSkeleton } from '@/components/client/profil/profil-skeleton';
import {
  getMe,
  homePathForRole,
  updateMe,
  logoutAndGoHome,
  type AuthUser,
} from '@/lib/api/auth-service';
import { listCities, type City } from '@/lib/api/cities-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

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
  const [loggedOut, setLoggedOut] = useState(false);

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
      setError(toUserErrorMessage(err, 'Erreur lors de la mise à jour.'));
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

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Mon profil" description="Gérez vos informations personnelles." backHref="/client" />

      <ProfilHero user={user} />

      {user.emailVerified === false ? (
        <Alert variant="warning" dense title="Email non vérifié">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex-1">
              Votre adresse email n&apos;est pas encore confirmée.
            </span>
            <Link
              href="/client/verification"
              className="shrink-0 text-sm font-medium text-warning-ink underline underline-offset-2"
            >
              Vérifier mon email
            </Link>
          </div>
        </Alert>
      ) : null}

      <div className="space-y-3">
        <AvatarUpload user={user} onUpdated={setUser} />
      </div>

      <div className="space-y-4">
        <SectionHeader title="Coordonnées" />
        <div className="space-y-4">
          <Field label="Prénom" htmlFor="profil-firstName" required>
            <Input id="profil-firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Nom" htmlFor="profil-lastName" required>
            <Input id="profil-lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
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
      </div>

      <div className="space-y-4">
        <SectionHeader title="Contact" />
        <div className="space-y-4">
          <Field label="Téléphone" htmlFor="profil-phone">
            <Input id="profil-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </Field>
          <Field label="WhatsApp" htmlFor="profil-whatsapp" hint="WhatsApp de préférence">
            <Input id="profil-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" />
          </Field>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader title="Compte" />
        <Field label="Email" htmlFor="profil-email" hint="L'email sert à la connexion et aux notifications.">
          <Input id="profil-email" value={user.email} disabled className="opacity-60" />
        </Field>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {saved ? <Alert variant="success" dense>Profil mis à jour.</Alert> : null}

      <Button
        onClick={handleSave}
        className="w-full"
        size="lg"
        isLoading={saving}
        disabled={!firstName.trim()}
      >
        Enregistrer les modifications
      </Button>

      <div className="flex flex-col gap-2 pt-2">
        <Link href="/client/demandes" className="block">
          <Button variant="secondary" className="w-full">
            Voir mes missions
          </Button>
        </Link>
        <Button variant="ghost" className="w-full text-error-ink hover:bg-error-soft" onClick={handleLogout} isLoading={loggedOut}>
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}