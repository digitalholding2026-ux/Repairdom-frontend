'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listDiagnosticScales,
  listDomains,
  type CatalogDomain,
  type DiagnosticScale,
  type DiagnosticScaleListQuery,
} from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';

/* IA-2 — données partagées de la liste des prix courants (recherche, domaine,
 * statut, pagination serveur). Présentation isolée Desktop/Mobile. */

export const SCALES_PAGE_SIZE = 20;

export type ScaleStatusFilter = 'all' | 'active' | 'inactive' | 'priced' | 'unpriced';

export interface ScalesFilter {
  search: string;
  domainId: string;
  status: ScaleStatusFilter;
  page: number;
}

export interface ScalesData {
  items: DiagnosticScale[];
  total: number;
  pages: number;
  page: number;
  loading: boolean;
  error: string | null;
  domains: CatalogDomain[];
  filter: ScalesFilter;
  setSearch: (value: string) => void;
  setDomainId: (value: string) => void;
  setStatus: (value: ScaleStatusFilter) => void;
  setPage: (value: number) => void;
  reload: () => void;
}

export function formatScaleAmount(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

export function scaleEditHref(scale: DiagnosticScale): string {
  return `/admin/catalog/${scale.domain.id}/${scale.problem.id}/${scale.id}`;
}

export function useDiagnosticScales(): ScalesData {
  const [filter, setFilter] = useState<ScalesFilter>({ search: '', domainId: '', status: 'all', page: 1 });
  const [items, setItems] = useState<DiagnosticScale[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<CatalogDomain[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listDomains()
      .then((list) => {
        if (!cancelled) setDomains(list);
      })
      .catch(() => {
        if (!cancelled) setDomains([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query: DiagnosticScaleListQuery = {
      search: filter.search.trim() || undefined,
      domainId: filter.domainId || undefined,
      active: filter.status === 'active' ? true : filter.status === 'inactive' ? false : undefined,
      hasScale: filter.status === 'priced' ? true : filter.status === 'unpriced' ? false : undefined,
      page: filter.page,
      limit: SCALES_PAGE_SIZE,
    };
    listDiagnosticScales(query)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
        setPages(result.pages);
        setPageState(result.page);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement des prix courants.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter, reloadToken]);

  const setSearch = useCallback((value: string) => {
    setFilter((prev) => ({ ...prev, search: value, page: 1 }));
  }, []);
  const setDomainId = useCallback((value: string) => {
    setFilter((prev) => ({ ...prev, domainId: value, page: 1 }));
  }, []);
  const setStatus = useCallback((value: ScaleStatusFilter) => {
    setFilter((prev) => ({ ...prev, status: value, page: 1 }));
  }, []);
  const setPage = useCallback((value: number) => {
    setFilter((prev) => ({ ...prev, page: Math.max(1, value) }));
  }, []);
  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return {
    items,
    total,
    pages,
    page,
    loading,
    error,
    domains,
    filter,
    setSearch,
    setDomainId,
    setStatus,
    setPage,
    reload,
  };
}
