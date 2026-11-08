'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/spinner';
import { searchAdminClients, type AdminClientUser } from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

export default function AdminClientsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminClientUser[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clients B2B"
        description="Recherche et gestion des comptes clients (B2C et B2B)."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

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
                    {item.firstName} {item.lastName ?? ''}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
