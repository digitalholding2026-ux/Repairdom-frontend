'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Field, Input } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import {
  searchAdminClients,
  searchAdminTechnicians,
  getAdminUserAccount,
  deleteAdminUserAccount,
  type AdminUserAccount,
} from '@/lib/api/admin-service';

type RoleTab = 'CLIENT' | 'TECHNICIAN';

interface SearchItem {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  isActive?: boolean;
}

const DEPENDENCY_LABELS: Record<string, string> = {
  demandesClient: 'Missions (client)',
  demandesTechnicien: 'Missions (technicien)',
  messages: 'Messages',
  diagnostics: 'Diagnostics',
  devis: 'Devis',
  notifications: 'Notifications',
  transactions: 'Écritures ledger',
  vaguesDispatch: 'Vagues dispatch',
  evenements: 'Événements mission',
  avisRediges: 'Avis rédigés',
  avisRecus: 'Avis reçus',
  documentsKyc: 'Documents KYC',
  revuesKyc: 'Revues KYC',
  profil: 'Profil technicien',
};

export default function AdminUsersPage() {
  const [tab, setTab] = useState<RoleTab>('CLIENT');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [account, setAccount] = useState<AdminUserAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    setNotice(null);
    setAccount(null);
    try {
      const data =
        tab === 'CLIENT' ? await searchAdminClients(q) : await searchAdminTechnicians(q);
      setResults(data.items);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de recherche.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (id: string) => {
    setAccountLoading(true);
    setError(null);
    setNotice(null);
    try {
      setAccount(await getAdminUserAccount(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement du compte.');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    setDeleting(true);
    setError(null);
    try {
      const outcome = await deleteAdminUserAccount(account.id);
      setNotice(outcome.message);
      setConfirmOpen(false);
      setAccount(await getAdminUserAccount(account.id).catch(() => null));
      setResults((prev) => prev.filter((item) => item.id !== account.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const activeDependencies = account
    ? Object.entries(account.dependencies).filter(([, count]) => count > 0)
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Utilisateurs"
        description="Recherchez un compte client ou technicien, consultez ses données liées, puis supprimez ou désactivez le compte."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex gap-2">
            <Button
              variant={tab === 'CLIENT' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setTab('CLIENT');
                setResults([]);
                setSearched(false);
                setAccount(null);
              }}
            >
              Clients
            </Button>
            <Button
              variant={tab === 'TECHNICIAN' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setTab('TECHNICIAN');
                setResults([]);
                setSearched(false);
                setAccount(null);
              }}
            >
              Techniciens
            </Button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSearch();
            }}
          >
            <Field label={tab === 'CLIENT' ? 'Rechercher un client' : 'Rechercher un technicien'} htmlFor="userSearch" className="flex-1">
              <Input
                id="userSearch"
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

      {searched ? (
        results.length === 0 ? (
          <EmptyState
            icon="search"
            title="Aucun compte"
            description="Aucun compte ne correspond à cette recherche."
          />
        ) : (
          <div className="space-y-2">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void handleSelect(item.id)}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between gap-3 pt-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.firstName} {item.lastName ?? ''}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                    </div>
                    {item.isActive === false ? (
                      <Badge variant="neutral">Désactivé</Badge>
                    ) : (
                      <Badge variant="success">Actif</Badge>
                    )}
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        )
      ) : null}

      {accountLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner />
        </div>
      ) : null}

      {account ? (
        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {account.firstName} {account.lastName ?? ''}
                </p>
                <p className="text-xs text-muted-foreground">{account.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">{account.role}</Badge>
                {account.isActive ? (
                  <Badge variant="success">Actif</Badge>
                ) : (
                  <Badge variant="neutral">Désactivé</Badge>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Données liées (historique préservé)
              </p>
              {activeDependencies.length === 0 ? (
                <p className="mt-1 text-sm">Aucune donnée liée — suppression physique possible.</p>
              ) : (
                <ul className="mt-1 space-y-0.5 text-sm">
                  {activeDependencies.map(([key, count]) => (
                    <li key={key} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        {DEPENDENCY_LABELS[key] ?? key}
                      </span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!account.deletable ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Des données sont liées : le compte sera désactivé (connexion bloquée),
                  jamais supprimé physiquement.
                </p>
              ) : null}
            </div>

            {account.isActive ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmOpen(true)}
                className="text-error-ink"
              >
                <Icon name="x" size="3.5" />
                Supprimer le compte
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Compte désactivé : connexion bloquée, historique conservé.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
        loading={deleting}
        tone="danger"
        title="Supprimer ce compte ?"
        description={
          account?.deletable
            ? 'Cette action est irréversible : le compte sera définitivement supprimé.'
            : 'Le compte possède des données liées : il sera désactivé (connexion bloquée, historique conservé). Cette action peut être irréversible, confirmez-vous ?'
        }
        confirmLabel={account?.deletable ? 'Supprimer définitivement' : 'Désactiver le compte'}
      />
    </div>
  );
}
