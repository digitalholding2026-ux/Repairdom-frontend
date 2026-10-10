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
  /* Normalisés à `null` et jamais `undefined` : « absent » est une absence de
   * donnée, pas une absence de valeur. Le composant d'affichage les passe
   * directement, sans avoir à départager les deux cas. */
  description: string | null;
  requestedMode: string | null;
  requestedAt: string | null;
  /* Technicien assigné, s'il y en a un. `null` tant que la demande n'a pas
   * été acceptée : le client voit alors « Recherche du technicien », ce qui est
   * plus juste qu'un bandeau vide. */
  technician: { firstName: string; lastName: string | null } | null;
}

/* Une demande ACTIVE est une intervention en cours de vie : elle a un
 * technicien, un créneau, une échéance. Même liste que celle du dashboard
 * technicien — volontairement, pour que les deux espaces parlent de la même
 * chose. */
export const ACTIVE_STATUSES = ['ACCEPTED', 'SCHEDULED', 'IN_PROGRESS'] as const;

export function isActiveMission(item: Pick<RecentItem, 'status'>): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(item.status);
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
    description: d.description ?? null,
    requestedMode: d.requestedMode ?? null,
    requestedAt: d.requestedAt ?? null,
    technician: d.technician
      ? { firstName: d.technician.firstName, lastName: d.technician.lastName }
      : null,
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
  /**
   * Intervention en cours, s'il y en a une — la plus avancée.
   *
   * Elle est DÉRIVÉE de `recent`, pas d'un appel de plus : les données sont
   * déjà là, seule la lecture manquait. Sans elle, une intervention commencée
   * il y a trois jours se retrouvait sous une demande d'aujourd'hui, triée
   * par date : exactement l'inverse de l'urgence.
   *
   * `null` quand rien n'est en cours. Le tri suit la progression réelle de
   * l'intervention (en cours > planifiée > acceptée), pas la date : deux
   * missions en vol ne se départagent pas par leur date de dépôt.
   */
  activeMission: RecentItem | null;
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

  const activeMission = useMemo<RecentItem | null>(() => {
    const actives = recent.filter(isActiveMission);
    if (actives.length === 0) return null;
    /* Rangs de progression : plus le rang est élevé, plus l'intervention est
     * avancée. `find` sur l'ordre des rangs évite un tri explicite. */
    const rangs: Record<string, number> = {
      IN_PROGRESS: 3,
      SCHEDULED: 2,
      ACCEPTED: 1,
    };
    return (
      [...actives].sort(
        (a, b) => (rangs[b.status] ?? 0) - (rangs[a.status] ?? 0),
      )[0] ?? null
    );
  }, [recent]);

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
    activeMission,
    handleLogout,
  };
}
