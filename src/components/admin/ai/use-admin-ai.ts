'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAdminAiOverview,
  getAdminSurveillanceLevel,
  listAdminAiClassifications,
  listAdminAiMatches,
  listAdminAiPricingChecks,
  listAdminAiWarnings,
  listAdminConversationFlags,
  reviewAdminAiWarning,
  reviewAdminConversationFlag,
  type AdminAiClassification,
  type AdminAiConversationFlag,
  type AdminAiMatch,
  type AdminAiOverview,
  type AdminAiPricingCheck,
  type AdminAiWarning,
} from '@/lib/api/admin-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import { AI_PAGE_SIZE } from './ai-dashboard-helpers';

/* IA-9 — hooks partagés du dashboard IA admin (données + pagination +
 * filtres serveur + revue). Présentation isolée (Desktop/Mobile).
 * Manual refresh uniquement (aucun polling agressif, §28). */

interface ListState<T> {
  items: T[];
  total: number;
  pages: number;
  page: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function useAdminAiList<T>(
  fetcher: (page: number) => Promise<{ items: T[]; total: number; pages: number; page: number }>,
  depsKey: string,
): ListState<T> & { setPage: (page: number) => void } {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
  }, []);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher(page)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
        setPages(res.pages);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(toUserErrorMessage(err, 'Erreur lors du chargement des signaux.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, reloadToken, depsKey]);

  return { items, total, pages, page, loading, error, reload, setPage };
}

export function useAdminAiOverview() {
  const [overview, setOverview] = useState<AdminAiOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminAiOverview()
      .then((res) => {
        if (cancelled) return;
        setOverview(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(toUserErrorMessage(err, 'Erreur lors du chargement de la vue d’ensemble.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { overview, loading, error, reload };
}

export interface AiFilter {
  status: string;
  extra: string;
  since: string;
}

export function useAiClassifications(filter: { classification: string; since: string }) {
  const key = `${filter.classification}|${filter.since}`;
  return useAdminAiList<AdminAiClassification>(
    (page) =>
      listAdminAiClassifications({
        classification: filter.classification || undefined,
        since: filter.since || undefined,
        page,
        limit: AI_PAGE_SIZE,
      }),
    key,
  );
}

export function useAiMatches(filter: { classification: string; since: string }) {
  const key = `${filter.classification}|${filter.since}`;
  return useAdminAiList<AdminAiMatch>(
    (page) =>
      listAdminAiMatches({
        classification: filter.classification || undefined,
        since: filter.since || undefined,
        page,
        limit: AI_PAGE_SIZE,
      }),
    key,
  );
}

export function useAiPricingChecks(filter: { result: string; since: string }) {
  const key = `${filter.result}|${filter.since}`;
  return useAdminAiList<AdminAiPricingCheck>(
    (page) =>
      listAdminAiPricingChecks({
        result: filter.result || undefined,
        since: filter.since || undefined,
        page,
        limit: AI_PAGE_SIZE,
      }),
    key,
  );
}

export function useAiWarnings(filter: { status: string; technicianId: string }) {
  const key = `${filter.status}|${filter.technicianId}`;
  const list = useAdminAiList<AdminAiWarning>(
    (page) =>
      listAdminAiWarnings({
        status: filter.status || undefined,
        technicianId: filter.technicianId || undefined,
        page,
        limit: AI_PAGE_SIZE,
      }),
    key,
  );
  return { ...list, review: reviewAdminAiWarning };
}

export function useAiConversationFlags(filter: { status: string; severity: string; category: string }) {
  const key = `${filter.status}|${filter.severity}|${filter.category}`;
  const list = useAdminAiList<AdminAiConversationFlag>(
    (page) =>
      listAdminConversationFlags({
        status: filter.status || undefined,
        severity: filter.severity || undefined,
        category: filter.category || undefined,
        page,
        limit: AI_PAGE_SIZE,
      }),
    key,
  );
  return { ...list, review: reviewAdminConversationFlag };
}

/* IA-9 §18 — vue technicien : avertissements + niveau + contrôles + flags
 * (événements séparés, jamais de score global). */
export function useAiTechnician(technicianId: string) {
  const warnings = useAiWarnings({ status: '', technicianId });
  const [level, setLevel] = useState<{ surveillanceLevel: number; humanReviewRequired: boolean } | null>(null);
  const [checks, setChecks] = useState<AdminAiPricingCheck[]>([]);
  const [flags, setFlags] = useState<AdminAiConversationFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = technicianId.trim();
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [levelRes, checksRes, flagsRes] = await Promise.all([
        getAdminSurveillanceLevel(id),
        listAdminAiPricingChecks({ technicianId: id, page: 1, limit: AI_PAGE_SIZE }),
        listAdminConversationFlags({ senderId: id, page: 1, limit: AI_PAGE_SIZE }),
      ]);
      setLevel({ surveillanceLevel: levelRes.surveillanceLevel, humanReviewRequired: levelRes.humanReviewRequired });
      setChecks(checksRes.items);
      setFlags(flagsRes.items);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Erreur lors du chargement des signaux du technicien.'));
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  return { warnings, level, checks, flags, loading, error, load };
}
