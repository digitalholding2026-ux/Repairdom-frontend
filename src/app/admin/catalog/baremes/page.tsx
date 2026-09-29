'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { ResponsiveView } from '@/components/ui/responsive-view';
import { CatalogSkeleton } from '@/components/admin/catalog/catalog-skeleton';
import { DiagnosticScalesDesktop } from '@/components/admin/catalog/diagnostic-scales-desktop';
import { DiagnosticScalesMobile } from '@/components/admin/catalog/diagnostic-scales-mobile';
import { useDiagnosticScales, type ScaleStatusFilter } from '@/components/admin/catalog/use-diagnostic-scales';

/* IA-2 — barèmes par diagnostic (ADMIN) : recherche, domaine, statut,
 * pagination serveur. Desktop = vraie table, Mobile = cartes tactiles
 * (données et règles partagées, UX isolées). Édition sur la page
 * diagnostic existante (aucun éditeur dupliqué). */

const STATUS_OPTIONS: Array<{ id: ScaleStatusFilter; label: string }> = [
  { id: 'all', label: 'Tous statuts' },
  { id: 'active', label: 'Diagnostics actifs' },
  { id: 'inactive', label: 'Diagnostics inactifs' },
  { id: 'priced', label: 'Avec barème actif' },
  { id: 'unpriced', label: 'Sans barème actif' },
];

export default function AdminBaremesPage() {
  const data = useDiagnosticScales();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Barèmes des diagnostics"
        description="Min / référence / max en FCFA par diagnostic (agrégés des tarifs d'interventions actifs)."
        backHref="/admin/catalog"
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          value={data.filter.search}
          onChange={(e) => data.setSearch(e.target.value)}
          placeholder="Rechercher un diagnostic ou une intervention…"
          aria-label="Rechercher un diagnostic"
        />
        <Select
          value={data.filter.domainId}
          onChange={(e) => data.setDomainId(e.target.value)}
          aria-label="Filtrer par domaine"
        >
          <option value="">Tous domaines</option>
          {data.domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </Select>
        <Select
          value={data.filter.status}
          onChange={(e) => data.setStatus(e.target.value as ScaleStatusFilter)}
          aria-label="Filtrer par statut"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {data.error ? (
        <Alert
          variant="error"
          action={
            <Button size="sm" variant="outline" onClick={() => data.reload()}>
              Réessayer
            </Button>
          }
        >
          {data.error}
        </Alert>
      ) : null}

      {data.loading ? (
        <CatalogSkeleton />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={<Icon name="star" size="md" />}
          title="Aucun barème trouvé"
          description="Ajustez la recherche ou les filtres, ou créez les tarifs depuis les pages diagnostic."
        />
      ) : (
        <ResponsiveView
          mobile={<DiagnosticScalesMobile data={data} />}
          desktop={<DiagnosticScalesDesktop data={data} />}
          fallback={<CatalogSkeleton />}
        />
      )}
    </div>
  );
}
