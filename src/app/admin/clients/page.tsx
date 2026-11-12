'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import {
  createB2BClient,
  searchAdminClients,
  type AdminClientUser,
  type CreateB2BClientInput,
  type CreateB2BClientResult,
} from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

export default function AdminClientsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminClientUser[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Création B2B (modale) */
  const [createOpen, setCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [b2bResult, setB2BResult] = useState<CreateB2BClientResult | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const data = await searchAdminClients(q);
      setResults(data.items);
      setSearched(true);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur de recherche.'));
    } finally {
      setSearching(false);
    }
  };

  const handleCreateB2B = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const input: CreateB2BClientInput = {
        companyName: companyName.trim(),
        firstName: contactFirstName.trim(),
        lastName: contactLastName.trim() || undefined,
        email: contactEmail.trim(),
        phone: contactPhone.trim() || undefined,
      };
      const result = await createB2BClient(input);
      setB2BResult(result);
      setCreateOpen(false);
      setCompanyName('');
      setContactFirstName('');
      setContactLastName('');
      setContactEmail('');
      setContactPhone('');
    } catch (err) {
      setCreateError(toUserErrorMessage(err, 'Impossible de créer le compte B2B.'));
    } finally {
      setCreating(false);
    }
  };

  const copyCodePro = (code: string | null) => {
    if (code) navigator.clipboard.writeText(code);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients B2B"
        description="Recherche et gestion des comptes clients (B2C et B2B)."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Card>
          <CardContent className="space-y-3 pt-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSearch();
              }}
            >
              <Field label="Rechercher un client" htmlFor="clientSearch" className="min-w-0 flex-1">
                <Input
                  id="clientSearch"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nom, prénom ou email…"
                />
              </Field>
              <Button type="submit" isLoading={searching} disabled={!query.trim()} className="self-end">
                <Icon name="search" size="3.5" />
                Rechercher
              </Button>
            </form>
          </CardContent>
        </Card>

        <Button
          type="button"
          onClick={() => {
            setCreateError(null);
            setB2BResult(null);
            setCreateOpen(true);
          }}
          className="flex-1 sm:flex-none bg-orange-500/90 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/15 backdrop-blur-sm transition hover:bg-orange-500"
        >
          <Icon name="user" size="sm" />
          Créer un compte B2B
        </Button>
      </div>

      {searching ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : searched && results.length === 0 ? (
        <EmptyState
          title="Aucun client"
          description="Aucun compte ne correspond à cette recherche."
        />
      ) : (
        <div className="space-y-2">
          {results.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {item.companyName ? item.companyName : item.firstName} {item.lastName ?? ''}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                  {item.phone && (
                    <p className="truncate text-xs text-muted-foreground">{item.phone}</p>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.clientType === 'B2B'
                        ? 'bg-orange-500/10 text-orange-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.clientType === 'B2B' ? 'B2B' : 'B2C'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.codePro && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                        {item.codePro}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyCodePro(item.codePro)}
                        className="size-6 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition"
                        aria-label="Copier le Code Pro"
                      >
                        <Icon name="copy" size="sm" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modale : création compte B2B */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Créer un compte B2B"
        description="Les identifiants générés vous seront affichés pour les communiquer au client."
      >
        <form onSubmit={handleCreateB2B} className="space-y-4">
          {createError ? <Alert variant="error">{createError}</Alert> : null}

          <Field label="Nom de la structure" htmlFor="b2b-company-name" required>
            <Input
              id="b2b-company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="SARL Exemple"
            />
          </Field>

          <Field label="Nom du contact" htmlFor="b2b-contact-first-name" required>
            <Input
              id="b2b-contact-first-name"
              value={contactFirstName}
              onChange={(e) => setContactFirstName(e.target.value)}
              placeholder="Prénom"
            />
          </Field>

          <Field label="Prénom du contact" htmlFor="b2b-contact-last-name">
            <Input
              id="b2b-contact-last-name"
              value={contactLastName}
              onChange={(e) => setContactLastName(e.target.value)}
              placeholder="Nom"
            />
          </Field>

          <Field label="E-mail" htmlFor="b2b-contact-email" required>
            <Input
              id="b2b-contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="contact@exemple.cm"
            />
          </Field>

          <Field label="Téléphone" htmlFor="b2b-contact-phone">
            <Input
              id="b2b-contact-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+237 6 90 00 00 00"
            />
          </Field>

          <div className="flex gap-2" slot="footer">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
              Annuler
            </Button>
            <button
              type="submit"
              disabled={creating || !companyName.trim() || !contactFirstName.trim() || !contactEmail.trim()}
              className="flex-1 rounded-xl bg-orange-500/90 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/15 backdrop-blur-sm transition hover:bg-orange-500 disabled:opacity-60"
            >
              {creating ? 'Création…' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Alerte de succès avec identifiants générés */}
      {b2bResult && (
        <Alert variant="success" className="max-w-md mx-auto">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Compte B2B créé avec succès</p>
              <p className="text-xs text-muted-foreground">
                Communiquez ces identifiants au client.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground">E-mail</p>
                <p className="text-foreground font-mono">{b2bResult.user.email}</p>
              </div>
              <div className="col-span-2">
                <p className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">Mot de passe temporaire</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="text-xs text-orange-600 hover:underline"
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </p>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={b2bResult.plainPassword}
                  readOnly
                  className="w-full font-mono text-xs text-foreground bg-muted rounded border border-border p-1 select-all"
                  onSelect={(e) => {
                    const target = e.target as HTMLInputElement;
                    target.select();
                  }}
                />
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Code Pro</p>
                <p className="text-foreground font-mono">{b2bResult.user.codePro}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Structure</p>
                <p className="text-foreground">{b2bResult.user.companyName}</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(
                  `E-mail : ${b2bResult.user.email}\nMot de passe : ${b2bResult.plainPassword}\nCode Pro : ${b2bResult.user.codePro ?? '—'}\nStructure : ${b2bResult.user.companyName}`,
                );
              }}
              className="w-full text-xs"
            >
              <Icon name="copy" size="sm" />
              Copier les identifiants
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}
