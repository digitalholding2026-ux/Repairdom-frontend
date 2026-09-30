'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { ResponsiveView } from '@/components/ui/responsive-view';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { AiOverviewView } from '@/components/admin/ai/ai-overview-view';
import { AiClassificationsDesktop, AiClassificationsMobile } from '@/components/admin/ai/ai-classifications-view';
import { AiMatchesDesktop, AiMatchesMobile } from '@/components/admin/ai/ai-matches-view';
import { AiPricingChecksDesktop, AiPricingChecksMobile } from '@/components/admin/ai/ai-pricing-checks-view';
import { AiWarningsDesktop, AiWarningsMobile } from '@/components/admin/ai/ai-warnings-view';
import { AiFlagsDesktop, AiFlagsMobile } from '@/components/admin/ai/ai-flags-view';
import { AiTechnicianView } from '@/components/admin/ai/ai-technician-view';
import {
  useAdminAiOverview,
  useAiClassifications,
  useAiConversationFlags,
  useAiMatches,
  useAiPricingChecks,
  useAiTechnician,
  useAiWarnings,
} from '@/components/admin/ai/use-admin-ai';

/* IA-9 — dashboard IA admin : voir, filtrer, examiner (jamais de décision
 * automatique). Données backend paginées, refresh manuel, Desktop (tables)
 * et Mobile (cards) structurellement séparés. */

const TABS = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'demandes', label: 'Demandes IA-4' },
  { id: 'diagnostics', label: 'Diagnostics IA-5' },
  { id: 'tarifs', label: 'Tarifs IA-6' },
  { id: 'avertissements', label: 'Avertissements IA-7' },
  { id: 'conversations', label: 'Conversations IA-8' },
  { id: 'technicien', label: 'Technicien' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">{children}</div>;
}

export default function AdminAiPage() {
  const [tab, setTab] = useState<TabId>('overview');

  const overview = useAdminAiOverview();

  const [classFilter, setClassFilter] = useState('');
  const [classSince, setClassSince] = useState('');
  const classifications = useAiClassifications({ classification: classFilter, since: classSince });

  const [matchFilter, setMatchFilter] = useState('');
  const [matchSince, setMatchSince] = useState('');
  const matches = useAiMatches({ classification: matchFilter, since: matchSince });

  const [checkFilter, setCheckFilter] = useState('');
  const [checkSince, setCheckSince] = useState('');
  const checks = useAiPricingChecks({ result: checkFilter, since: checkSince });

  const [warningFilter, setWarningFilter] = useState('');
  const [warningTech, setWarningTech] = useState('');
  // EXPIRED est dérivé (PENDING + échéance dépassée, jamais stocké) : le
  // filtre interroge les PENDING, le badge affiche le statut effectif.
  const warnings = useAiWarnings({
    status: warningFilter === 'EXPIRED' ? 'PENDING' : warningFilter,
    technicianId: warningTech.trim(),
  });

  const [flagStatus, setFlagStatus] = useState('OPEN');
  const [flagSeverity, setFlagSeverity] = useState('');
  const [flagCategory, setFlagCategory] = useState('');
  const flags = useAiConversationFlags({ status: flagStatus, severity: flagSeverity, category: flagCategory });

  const [technicianId, setTechnicianId] = useState('');
  const technician = useAiTechnician(technicianId);

  const reloadActive = () => {
    if (tab === 'overview') overview.reload();
    if (tab === 'demandes') classifications.reload();
    if (tab === 'diagnostics') matches.reload();
    if (tab === 'tarifs') checks.reload();
    if (tab === 'avertissements') warnings.reload();
    if (tab === 'conversations') flags.reload();
    if (tab === 'technicien') technician.load();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Surveillance IA"
        description="Signaux IA-4 → IA-8 : observer et examiner. L’humain décide."
        actions={
          <Button variant="secondary" size="sm" onClick={reloadActive}>
            <Icon name="search" size="sm" />
            <span className="ml-1">Actualiser</span>
          </Button>
        }
      />
      <Tabs items={TABS} value={tab} onChange={(id) => setTab(id as TabId)} variant="pills" label="Sections du dashboard IA" />

      {tab === 'overview' ? (
        <AiOverviewView overview={overview.overview} loading={overview.loading} error={overview.error} reload={overview.reload} />
      ) : null}

      {tab === 'demandes' ? (
        <div className="space-y-3">
          <FilterBar>
            <Field label="Classification" htmlFor="ai-class-filter">
              <Select
                id="ai-class-filter"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  classifications.setPage(1);
                }}
              >
                <option value="">Toutes</option>
                <option value="CLASSIFIED">Classifié</option>
                <option value="UNCERTAIN">Incertain</option>
                <option value="UNCLASSIFIABLE">Non classifiable</option>
              </Select>
            </Field>
            <Field label="Depuis le" htmlFor="ai-class-since">
              <Input
                id="ai-class-since"
                type="date"
                value={classSince}
                onChange={(e) => {
                  setClassSince(e.target.value);
                  classifications.setPage(1);
                }}
              />
            </Field>
          </FilterBar>
          <Alert variant="info">Classification IA d’aide au dispatch — pas une décision définitive.</Alert>
          <ResponsiveView
            mobile={<AiClassificationsMobile controller={classifications} />}
            desktop={<AiClassificationsDesktop controller={classifications} />}
            fallback={<SkeletonCard />}
          />
        </div>
      ) : null}

      {tab === 'diagnostics' ? (
        <div className="space-y-3">
          <FilterBar>
            <Field label="Résultat" htmlFor="ai-match-filter">
              <Select
                id="ai-match-filter"
                value={matchFilter}
                onChange={(e) => {
                  setMatchFilter(e.target.value);
                  matches.setPage(1);
                }}
              >
                <option value="">Tous</option>
                <option value="MATCHED">Apparié</option>
                <option value="UNCERTAIN">Incertain</option>
                <option value="UNMATCHED">Non apparié</option>
              </Select>
            </Field>
            <Field label="Depuis le" htmlFor="ai-match-since">
              <Input
                id="ai-match-since"
                type="date"
                value={matchSince}
                onChange={(e) => {
                  setMatchSince(e.target.value);
                  matches.setPage(1);
                }}
              />
            </Field>
          </FilterBar>
          <Alert variant="info">Le diagnostic libre du technicien reste la source de vérité.</Alert>
          <ResponsiveView
            mobile={<AiMatchesMobile controller={matches} />}
            desktop={<AiMatchesDesktop controller={matches} />}
            fallback={<SkeletonCard />}
          />
        </div>
      ) : null}

      {tab === 'tarifs' ? (
        <div className="space-y-3">
          <FilterBar>
            <Field label="Résultat" htmlFor="ai-check-filter">
              <Select
                id="ai-check-filter"
                value={checkFilter}
                onChange={(e) => {
                  setCheckFilter(e.target.value);
                  checks.setPage(1);
                }}
              >
                <option value="">Tous</option>
                <option value="NORMAL">Normal</option>
                <option value="ABOVE_MAX">Au-dessus du max</option>
                <option value="BELOW_MIN">Sous le min</option>
                <option value="UNCERTAIN">Incertain</option>
                <option value="NO_BAREME">Sans barème</option>
              </Select>
            </Field>
            <Field label="Depuis le" htmlFor="ai-check-since">
              <Input
                id="ai-check-since"
                type="date"
                value={checkSince}
                onChange={(e) => {
                  setCheckSince(e.target.value);
                  checks.setPage(1);
                }}
              />
            </Field>
          </FilterBar>
          <Alert variant="info">Montants en XAF — snapshot figé au moment du devis.</Alert>
          <ResponsiveView
            mobile={<AiPricingChecksMobile controller={checks} />}
            desktop={<AiPricingChecksDesktop controller={checks} />}
            fallback={<SkeletonCard />}
          />
        </div>
      ) : null}

      {tab === 'avertissements' ? (
        <div className="space-y-3">
          <FilterBar>
            <Field label="Statut" htmlFor="ai-warning-filter">
              <Select
                id="ai-warning-filter"
                value={warningFilter}
                onChange={(e) => {
                  setWarningFilter(e.target.value);
                  warnings.setPage(1);
                }}
              >
                <option value="">Tous</option>
                <option value="PENDING">En attente</option>
                <option value="JUSTIFIED">Justifié</option>
                <option value="EXPIRED">Délai dépassé (dérivé)</option>
                <option value="REVIEWED">Examiné</option>
              </Select>
            </Field>
            <Field label="Technicien (ID)" htmlFor="ai-warning-tech">
              <Input
                id="ai-warning-tech"
                value={warningTech}
                onChange={(e) => {
                  setWarningTech(e.target.value);
                  warnings.setPage(1);
                }}
                placeholder="UUID (optionnel)"
              />
            </Field>
          </FilterBar>
          <ResponsiveView
            mobile={<AiWarningsMobile controller={warnings} />}
            desktop={<AiWarningsDesktop controller={warnings} />}
            fallback={<SkeletonCard />}
          />
        </div>
      ) : null}

      {tab === 'conversations' ? (
        <div className="space-y-3">
          <FilterBar>
            <Field label="Statut" htmlFor="ai-flag-status">
              <Select
                id="ai-flag-status"
                value={flagStatus}
                onChange={(e) => {
                  setFlagStatus(e.target.value);
                  flags.setPage(1);
                }}
              >
                <option value="">Tous</option>
                <option value="OPEN">Ouvert</option>
                <option value="REVIEWED">Examiné</option>
                <option value="DISMISSED">Écarté</option>
              </Select>
            </Field>
            <Field label="Sévérité" htmlFor="ai-flag-severity">
              <Select
                id="ai-flag-severity"
                value={flagSeverity}
                onChange={(e) => {
                  setFlagSeverity(e.target.value);
                  flags.setPage(1);
                }}
              >
                <option value="">Toutes</option>
                <option value="LOW">Basse</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="HIGH">Haute</option>
              </Select>
            </Field>
            <Field label="Catégorie" htmlFor="ai-flag-category">
              <Select
                id="ai-flag-category"
                value={flagCategory}
                onChange={(e) => {
                  setFlagCategory(e.target.value);
                  flags.setPage(1);
                }}
              >
                <option value="">Toutes</option>
                <option value="OFF_PLATFORM_PAYMENT">Paiement hors plateforme</option>
                <option value="OFF_PLATFORM_CONTACT">Contact hors plateforme</option>
                <option value="CONVERSATION_INCONSISTENCY">Incohérence</option>
                <option value="PRICE_DISCREPANCY">Écart de prix</option>
                <option value="POTENTIAL_FRAUD">Fraude potentielle</option>
                <option value="ABUSIVE_OR_PRESSURING_BEHAVIOR">Pression / abus</option>
                <option value="OTHER">Autre</option>
              </Select>
            </Field>
          </FilterBar>
          <Alert variant="info">Liste sans contenu intégral — le message concerné s’ouvre au détail.</Alert>
          <ResponsiveView
            mobile={<AiFlagsMobile controller={flags} />}
            desktop={<AiFlagsDesktop controller={flags} />}
            fallback={<SkeletonCard />}
          />
        </div>
      ) : null}

      {tab === 'technicien' ? (
        <AiTechnicianView data={technician} technicianId={technicianId} setTechnicianId={setTechnicianId} />
      ) : null}
    </div>
  );
}
