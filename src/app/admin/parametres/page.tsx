'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field, Input } from '@/components/ui';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { getAdminSettings, updateAdminSettings, type PlatformSetting } from '@/lib/api/settings-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

export default function AdminParametresPage() {
  const [setting, setSetting] = useState<PlatformSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getAdminSettings();
      setSetting(s);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible de charger les paramètres.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setting) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminSettings({
        adminName: setting.adminName,
        adminWhatsApp: setting.adminWhatsApp,
        adminAvatarUrl: setting.adminAvatarUrl,
        supportEmail: setting.supportEmail,
      });
      setSetting(updated);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Impossible d\'enregistrer les paramètres.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !setting) return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-5 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader title="Paramètres" description="Configuration globale de la plateforme." />
        <div role="status" aria-label="Chargement">
          <span className="sr-only">Chargement…</span>
          <Spinner />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-5 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="Paramètres"
          description="Configurez le nom, le numéro WhatsApp et l'avatar du technicien affiché aux clients."
        />

        {error ? <Alert variant="error">{error}</Alert> : null}

        <form onSubmit={handleSave} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Informations du technicien</CardTitle>
              <CardDescription>
                Ces informations sont affichées aux clients dans le wizard de
                demande et sur la page de suivi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Nom du technicien" htmlFor="adminName" className="min-w-0">
                <Input
                  id="adminName"
                  value={setting.adminName}
                  onChange={(e) =>
                    setSetting((s) => (s ? { ...s, adminName: e.target.value } : null))
                  }
                  required
                />
              </Field>

              <Field label="Numéro WhatsApp" htmlFor="adminWhatsApp" className="min-w-0">
                <Input
                  id="adminWhatsApp"
                  type="tel"
                  value={setting.adminWhatsApp}
                  onChange={(e) =>
                    setSetting((s) => (s ? { ...s, adminWhatsApp: e.target.value } : null))
                  }
                  placeholder="237600000000"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Indicatif du pays inclus (ex: 237698473737 pour le Cameroun).
                </p>
              </Field>

              <Field label="URL de l'avatar" htmlFor="adminAvatarUrl" className="min-w-0">
                <Input
                  id="adminAvatarUrl"
                  type="url"
                  value={setting.adminAvatarUrl ?? ''}
                  onChange={(e) =>
                    setSetting((s) =>
                      s ? { ...s, adminAvatarUrl: e.target.value || null } : null
                    )
                  }
                  placeholder="https://exemple.com/avatar.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Photo affichée à côté du technicien. Laissez vide pour l'avatar par défaut.
                </p>
              </Field>

              <Field label="E-mail de support" htmlFor="supportEmail" className="min-w-0">
                <Input
                  id="supportEmail"
                  type="email"
                  value={setting.supportEmail ?? ''}
                  onChange={(e) =>
                    setSetting((s) => s ? { ...s, supportEmail: e.target.value || null } : null)
                  }
                  placeholder="support@relioo.space"
                />
                <p className="text-xs text-muted-foreground">
                  Adresse e-mail de contact (optionnel).
                </p>
              </Field>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="w-auto">
              {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
