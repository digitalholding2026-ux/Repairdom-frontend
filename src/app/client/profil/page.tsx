'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { ProfilHero } from '@/components/client/profil/profil-hero';
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

const CARD_CLASS =
  'rounded-2xl border border-slate-200 bg-card p-6 shadow-sm dark:border-slate-800';

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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
    setLoggingOut(true);
    await logoutAndGoHome();
  };

  if (loading) {
    return <ProfilSkeleton />;
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon profil"
        description="Gérez vos informations personnelles et vos coordonnées de contact."
      />

      <ProfilHero user={user} onUpdated={setUser} />

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

      {error ? <Alert variant="error">{error}</Alert> : null}
      {saved ? <Alert variant="success" dense>Profil mis à jour.</Alert> : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale : coordonnées */}
        <div className="space-y-6 lg:col-span-2">
          <section className={`${CARD_CLASS} space-y-6`}>
            <SectionHeader title="Informations personnelles" icon="user" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <Field label="Adresse précise / Quartier" htmlFor="profil-address">
                <Input id="profil-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Akwa, Rue de la Joie" />
              </Field>
            </div>
          </section>

          <section className={`${CARD_CLASS} space-y-6`}>
            <SectionHeader title="Moyens de contact" icon="phone" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Téléphone principal (MTN / Orange)" htmlFor="profil-phone">
                <div className="flex gap-2">
                  <span
                    aria-hidden
                    className="inline-flex h-11 shrink-0 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
                  >
                    +237
                  </span>
                  <Input id="profil-phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="6 90 00 00 00" />
                </div>
              </Field>
              <Field label="Numéro WhatsApp" htmlFor="profil-whatsapp">
                <Input id="profil-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" placeholder="6 90 00 00 00" />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Ce numéro sera utilisé par les techniciens pour vous joindre lors des interventions.
            </p>
          </section>
        </div>

        {/* Colonne secondaire : compte & sécurité */}
        <aside className="space-y-6 lg:col-span-1">
          <section className={`${CARD_CLASS} space-y-6`}>
            <SectionHeader title="Compte & Connexion" icon="shield-check" />
            <Field
              label={
                <span className="inline-flex items-center gap-2">
                  Adresse e-mail
                  <Badge variant="outline">Identifiant unique</Badge>
                </span>
              }
              htmlFor="profil-email"
            >
              <Input id="profil-email" value={user.email} disabled className="opacity-60" />
            </Field>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Statut du compte</span>
              {user.emailVerified ? (
                <Badge variant="success">Email vérifié</Badge>
              ) : (
                <Badge variant="warning">Email non vérifié</Badge>
              )}
            </div>
          </section>

          <section className={`${CARD_CLASS} space-y-4`}>
            <Button
              variant="primary"
              size="lg"
              className="w-full shadow-md shadow-primary/20"
              onClick={handleSave}
              isLoading={saving}
              disabled={!firstName.trim()}
            >
              <Icon name="check" size="sm" />
              Enregistrer les modifications
            </Button>
            <div className="h-px bg-border" aria-hidden />
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setConfirmLogout(true)}
            >
              <Icon name="logout" size="sm" />
              Se déconnecter
            </Button>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Se déconnecter ?"
        description="Vous devrez vous reconnecter pour accéder à votre espace client."
        confirmLabel="Se déconnecter"
        cancelLabel="Rester connecté"
        tone="danger"
        loading={loggingOut}
        onConfirm={() => void handleLogout()}
        onCancel={() => { if (!loggingOut) setConfirmLogout(false); }}
      />
    </div>
  );
}
