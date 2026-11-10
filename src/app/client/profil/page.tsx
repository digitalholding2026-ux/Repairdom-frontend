'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { WhatsAppMark } from '@/components/lottie/lottie-animations';
import { PageHeader } from '@/components/ui/page-header';
import { ProfilHero } from '@/components/client/profil/profil-hero';
import { ProfilSkeleton } from '@/components/client/profil/profil-skeleton';
import { PushNotificationCard } from '@/components/ui/push-notification-card';
import {
  getMe,
  homePathForRole,
  updateMe,
  logoutAndGoHome,
  changePassword,
  type AuthUser,
} from '@/lib/api/auth-service';
import { listCities, type City } from '@/lib/api/cities-service';
import { isPasswordStrong, passwordRequirementsMessage } from '@/lib/password-strength';
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
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  /* Changement de mot de passe (modale) */
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const handleChangePassword = async () => {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }
    if (!isPasswordStrong(newPassword)) {
      setError(passwordRequirementsMessage());
      return;
    }
    setChangingPwd(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setChangePwdOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors du changement de mot de passe.'));
    } finally {
      setChangingPwd(false);
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
    <div className="space-y-4">
      <PageHeader
        title="Mon profil"
        description="Gérez vos informations personnelles et vos coordonnées de contact."
      />

      <ProfilHero user={user} onUpdated={setUser} />

      {/* Espace Professionnel — affiché uniquement pour les comptes B2B */}
      {user.clientType === 'B2B' && (
        <section
          aria-label="Espace professionnel"
          className="rounded-2xl border border-slate-100 bg-orange-50 p-5 shadow-sm dark:border-slate-800 dark:bg-orange-500/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
              B2B
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Espace Professionnel
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Nom de la structure
              </p>
              <p className="text-slate-900 dark:text-white font-medium">
                {user.companyName ?? '—'}
              </p>
            </div>
            <div className="space-y-1 flex flex-col md:flex-row md:items-end gap-2">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Code Pro
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                  {user.codePro ?? '—'}
                </span>
                {user.codePro ? (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.codePro ?? '');
                    }}
                    className="size-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition"
                    aria-label="Copier le Code Pro"
                  >
                    <Icon name="copy" size="sm" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Votre Code Pro vous permet d'accéder aux tarifs professionnels sur
            le catalogue Relio.
          </p>
        </section>
      )}

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

      {/* Formulaire compact : une seule carte, champs en grille 2 colonnes */}
      <section
        aria-label="Informations du profil"
        className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-relio-card"
      >
        <div className="grid grid-cols-2 gap-3 [&_label]:text-xs">
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
          <Field label="Adresse / Quartier" htmlFor="profil-address">
            <Input id="profil-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Akwa, Rue de la Joie" />
          </Field>
          <Field label="Téléphone principal" htmlFor="profil-phone">
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
          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                Numéro WhatsApp
                <WhatsAppMark />
              </span>
            }
            htmlFor="profil-whatsapp"
          >
            <Input id="profil-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} inputMode="tel" placeholder="6 90 00 00 00" />
          </Field>
          <Field label="Adresse e-mail" htmlFor="profil-email" className="col-span-2">
            <Input id="profil-email" value={user.email} disabled className="opacity-60" />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          Ces coordonnées permettent à l'équipe Relio de vous joindre lors des
          interventions.
        </p>

        <div className="flex gap-2">
          <button
            type="submit"
            onClick={() => void handleSave()}
            disabled={saving || !firstName.trim()}
            className="flex-1 rounded-xl bg-orange-500/90 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/15 backdrop-blur-sm transition hover:bg-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 active:scale-[0.99] disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="rounded-xl border border-error-border bg-error-soft px-4 py-3 text-sm font-semibold text-error-ink transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
          >
            Déconnexion
          </button>
        </div>
      </section>

      {/* Sécurité : changement de mot de passe */}
      <section
        aria-label="Sécurité du compte"
        className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-relio-card"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Mot de passe
            </p>
            <p className="text-xs text-muted-foreground">
              Modifiez votre mot de passe pour sécuriser votre compte.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setChangePwdOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition"
          >
            <Icon name="wrench" size="sm" />
            Modifier mon mot de passe
          </button>
        </div>
      </section>

      <PushNotificationCard />

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

      {/* Modale : changement de mot de passe */}
      <Modal
        open={changePwdOpen}
        onClose={() => setChangePwdOpen(false)}
        title="Modifier mon mot de passe"
        description="Saisissez votre ancien mot de passe et définissez le nouveau."
      >
        <div className="space-y-4">
          <Field
            label="Ancien mot de passe"
            htmlFor="cp-current-password"
            required
          >
            <Input
              id="cp-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={changingPwd}
            />
          </Field>
          <Field label="Nouveau mot de passe" htmlFor="cp-new-password" required>
            <Input
              id="cp-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={changingPwd}
            />
            {newPassword.length > 0 && (
              <p className={`text-xs ${isPasswordStrong(newPassword) ? 'text-success-ink' : 'text-error-ink'}`}>
                {isPasswordStrong(newPassword) ? 'Mot de passe fort' : passwordRequirementsMessage()}
              </p>
            )}
          </Field>
          <Field label="Confirmer le nouveau mot de passe" htmlFor="cp-confirm-password" required>
            <Input
              id="cp-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={changingPwd}
            />
          </Field>
        </div>
        <div className="flex gap-2" slot="footer">
          <Button variant="secondary" onClick={() => setChangePwdOpen(false)} disabled={changingPwd}>
            Annuler
          </Button>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={changingPwd || !newPassword || !confirmPassword || !isPasswordStrong(newPassword)}
            className="flex-1 rounded-xl bg-orange-500/90 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/15 backdrop-blur-sm transition hover:bg-orange-500 disabled:opacity-60"
          >
            {changingPwd ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
