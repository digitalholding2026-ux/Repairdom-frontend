'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, logoutAndGoHome, homePathForRole, type AuthUser } from '@/lib/api/auth-service';
import {
  listMyDemandes,
  listMyDemandeHistory,
  type DemandeListItem,
} from '@/lib/api/request-service';
import { getClientFinanceSummary, type ClientFinanceSummary } from '@/lib/api/finance-service';
import { toUserErrorMessage } from '@/lib/ui-error-message';
import type { ClientDashboardVariant } from '@/components/client/client-dashboard';

export interface RecentItem {
  key: string;
  id: string;
  categoryLabel: string;
  reference: string;
  status: string;
  createdAt: string;
  href: string;
}

export function toRecentItem(d: DemandeListItem, kind: 'demande' | 'history'): RecentItem {
  return {
    key: `${kind}-${d.id}`,
    id: d.id,
    categoryLabel: d.categoryLabel,
    reference: d.reference,
    status: d.status,
    createdAt: d.createdAt,
    href: kind === 'demande' ? `/client/demandes/${d.id}` : '/client/demandes/historique',
  };
}

export interface ClientDashboardData {
  user: AuthUser | null;
  demandes: DemandeListItem[];
  historique: DemandeListItem[];
  balance: ClientFinanceSummary | null;
  showBalance: boolean;
  setShowBalance: (value: boolean | ((prev: boolean) => boolean)) => void;
  loading: boolean;
  error: string | null;
  recent: RecentItem[];
  handleLogout: () => Promise<void>;
}

/* CHANTIER UI DESKTOP & MOBILE — couche données PARTAGÉE du dashboard
 * client (API, permissions, chargement : identiques pour les deux vues).
 * Seule la présentation diverge (`ClientHomeMobileView` /
 * `ClientHomeDesktopView`). Aucune logique métier déplacée. */
export function useClientDashboardData(
  variant: ClientDashboardVariant = 'home',
): ClientDashboardData {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [demandes, setDemandes] = useState<DemandeListItem[]>([]);
  const [historique, setHistorique] = useState<DemandeListItem[]>([]);
  const [balance, setBalance] = useState<ClientFinanceSummary | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.role !== 'CLIENT') {
          router.replace(homePathForRole(me.role));
          return;
        }
        const [missions, history] = await Promise.all([
          variant === 'history' ? Promise.resolve([]) : listMyDemandes(),
          variant === 'list' ? Promise.resolve([]) : listMyDemandeHistory(),
        ]);
        if (!cancelled) {
          setUser(me);
          setDemandes(missions);
          setHistorique(history);
        }
        getClientFinanceSummary()
          .then((b) => {
            if (!cancelled) setBalance(b);
          })
          .catch(() => undefined);
      } catch (err) {
        if (!cancelled) setError(toUserErrorMessage(err, 'Erreur de chargement.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router, variant]);

  const recent = useMemo<RecentItem[]>(() => {
    const all: RecentItem[] = [
      ...demandes.map((d) => toRecentItem(d, 'demande')),
      ...historique.map((d) => toRecentItem(d, 'history')),
    ];
    return all
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [demandes, historique]);

  const handleLogout = async () => {
    await logoutAndGoHome();
  };

  return {
    user,
    demandes,
    historique,
    balance,
    showBalance,
    setShowBalance,
    loading,
    error,
    recent,
    handleLogout,
  };
}
