/* Chantier #2D — centre de notifications : mapping, actions, regroupement.
 *
 * Exécuté avec Node 24 natif (type stripping, zéro dépendance) :
 *   node --test src/lib/notifications/notification-mapping.test.ts
 * ou : npm run test:unit
 *
 * Ces tests portent sur la LOGIQUE (pures, sans React) : c'est elle qui décide
 * de la section, du bouton affiché et du regroupement. Le composant ne fait
 * que la rendre, donc le tester ici couvre le comportement réellement vu.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  URGENCY_ORDER,
  getActionForNotification,
  getUrgencyForNotification,
  groupNotificationsByMission,
  hasNavigableAction,
  isSectionEmpty,
  sortNotifications,
  urgencyPriority,
  type NotificationRole,
} from './notification-mapping.ts';
import type { AppNotification } from '../api/notifications-service.ts';

const read = (rel: string): string =>
  readFileSync(new URL(rel, import.meta.url), 'utf8');

let sequence = 0;
function notif(overrides: Partial<AppNotification> = {}): AppNotification {
  sequence += 1;
  return {
    id: `n${sequence}`,
    type: 'QUOTE_CREATED',
    title: 'Titre',
    message: 'Message',
    demandeId: 'd1',
    reference: 'RD-4821',
    metadata: null,
    read: false,
    createdAt: `2026-10-11T08:00:00.000Z`,
    ...overrides,
  };
}

/* ── Urgence (§ « trois sections par urgence ») ─────────────────────────── */

void test('chaque type de l’enum backend a une urgence, pas de repli silencieux', () => {
  // Les 15 valeurs de l'enum Prisma `NotificationType`.
  const backendTypes = [
    'TECHNICIAN_ACCEPTED',
    'QUOTE_CREATED',
    'NEGOTIATION_REQUESTED',
    'QUOTE_ACCEPTED',
    'QUOTE_REJECTED',
    'SCHEDULED',
    'COMPLETED',
    'CONFIRMED',
    'MISSION_AVAILABLE',
    'ADMIN_MESSAGE',
    'TECHNICIAN_EN_ROUTE',
    'PRICING_WARNING',
    'CONVERSATION_FLAG',
    'DISPUTE_OPENED',
    'DISPUTE_RESOLVED',
  ];
  for (const type of backendTypes) {
    const urgency = getUrgencyForNotification(notif({ type }));
    assert.ok(
      ['ACTION', 'FOLLOW_UP', 'INFO'].includes(urgency),
      `${type} : urgence invalide (${urgency})`,
    );
  }
});

void test('les 6 types d’action sont classés ACTION', () => {
  for (const type of [
    'QUOTE_CREATED',
    'NEGOTIATION_REQUESTED',
    'COMPLETED',
    'PRICING_WARNING',
    'DISPUTE_OPENED',
    'CONVERSATION_FLAG',
  ]) {
    assert.equal(getUrgencyForNotification(notif({ type })), 'ACTION', type);
  }
});

void test('les 7 types de suivi sont classés FOLLOW_UP', () => {
  for (const type of [
    'TECHNICIAN_ACCEPTED',
    'TECHNICIAN_EN_ROUTE',
    'TECHNICIAN_ARRIVED',
    'QUOTE_ACCEPTED',
    'QUOTE_REJECTED',
    'SCHEDULED',
    'CONFIRMED',
  ]) {
    assert.equal(getUrgencyForNotification(notif({ type })), 'FOLLOW_UP', type);
  }
});

void test('les 3 types d’info sont classés INFO', () => {
  for (const type of ['MISSION_AVAILABLE', 'ADMIN_MESSAGE', 'DISPUTE_RESOLVED']) {
    assert.equal(getUrgencyForNotification(notif({ type })), 'INFO', type);
  }
});

void test('type inconnu → INFO (dégradation sûre, jamais une fausse action)', () => {
  assert.equal(getUrgencyForNotification(notif({ type: 'TYPE_DE_LA_FUTURE' })), 'INFO');
});

/* ── Ordre des sections ─────────────────────────────────────────────────── */

void test('l’ordre des sections est ACTION → FOLLOW_UP → INFO', () => {
  assert.deepEqual([...URGENCY_ORDER], ['ACTION', 'FOLLOW_UP', 'INFO']);
  assert.ok(urgencyPriority('ACTION') < urgencyPriority('FOLLOW_UP'));
  assert.ok(urgencyPriority('FOLLOW_UP') < urgencyPriority('INFO'));
});

void test('une section vide est détectée comme telle (elle disparaît de l’affichage)', () => {
  assert.equal(isSectionEmpty([], []), true);
  assert.equal(isSectionEmpty([], [notif()]), false);
});

/* ── Actions contextuelles (type × rôle) ───────────────────────────────── */

void test('QUOTE_CREATED : action client uniquement, « Voir le devis »', () => {
  const notification = notif({ type: 'QUOTE_CREATED', demandeId: 'd1' });
  const asClient = getActionForNotification(notification, 'CLIENT');
  assert.equal(asClient?.label, 'Voir le devis');
  assert.equal(asClient?.href, '/client/demandes/d1');
  // Un technicien ne valide pas de devis : aucun bouton de navigation.
  assert.equal(getActionForNotification(notification, 'TECHNICIAN')?.href, null);
});

void test('QUOTE_ACCEPTED / QUOTE_REJECTED : action technicien', () => {
  for (const type of ['QUOTE_ACCEPTED', 'QUOTE_REJECTED']) {
    const action = getActionForNotification(notif({ type }), 'TECHNICIAN');
    assert.equal(action?.label, 'Voir la mission', type);
    assert.equal(action?.href, '/technicien/demandes/d1', type);
  }
});

void test('NEGOTIATION_REQUESTED : « Répondre » vers le chat de la mission', () => {
  const action = getActionForNotification(
    notif({ type: 'NEGOTIATION_REQUESTED' }),
    'TECHNICIAN',
  );
  assert.equal(action?.label, 'Répondre');
  assert.equal(action?.href, '/technicien/demandes/d1#chat');
});

void test('TECHNICIAN_EN_ROUTE / ARRIVED : « Voir la carte » côté client', () => {
  for (const type of ['TECHNICIAN_EN_ROUTE', 'TECHNICIAN_ARRIVED']) {
    const action = getActionForNotification(notif({ type }), 'CLIENT');
    assert.equal(action?.label, 'Voir la carte', type);
    assert.equal(action?.href, '/client/demandes/d1#map', type);
  }
});

void test('COMPLETED : « Confirmer la fin » côté client', () => {
  const action = getActionForNotification(notif({ type: 'COMPLETED' }), 'CLIENT');
  assert.equal(action?.label, 'Confirmer la fin');
  assert.equal(action?.href, '/client/demandes/d1#confirm');
});

void test('CONFIRMED : « Voir mes revenus » côté technicien', () => {
  const action = getActionForNotification(notif({ type: 'CONFIRMED' }), 'TECHNICIAN');
  assert.equal(action?.label, 'Voir mes revenus');
  assert.equal(action?.href, '/technicien/revenus');
});

void test('MISSION_AVAILABLE : liste des missions (pas d’ancrage sur une mission)', () => {
  const action = getActionForNotification(notif({ type: 'MISSION_AVAILABLE' }), 'TECHNICIAN');
  assert.equal(action?.href, '/technicien/demandes');
});

void test('PRICING_WARNING : « Justifier » vers la mission du devis', () => {
  const action = getActionForNotification(notif({ type: 'PRICING_WARNING' }), 'TECHNICIAN');
  assert.equal(action?.label, 'Justifier');
  assert.equal(action?.href, '/technicien/demandes/d1');
});

void test('DISPUTE_OPENED : l’admin ouvre le litige de la mission', () => {
  const action = getActionForNotification(notif({ type: 'DISPUTE_OPENED' }), 'ADMIN');
  assert.equal(action?.label, 'Ouvrir le litige');
  assert.equal(action?.href, '/admin/litiges/d1');
});

void test('DISPUTE_RESOLVED : consultation de la décision selon le rôle', () => {
  assert.equal(
    getActionForNotification(notif({ type: 'DISPUTE_RESOLVED' }), 'CLIENT')?.href,
    '/client/demandes/d1',
  );
  assert.equal(
    getActionForNotification(notif({ type: 'DISPUTE_RESOLVED' }), 'TECHNICIAN')?.href,
    '/technicien/demandes/d1',
  );
});

void test('CONVERSATION_FLAG : l’admin est envoyé vers l’assistant', () => {
  const action = getActionForNotification(notif({ type: 'CONVERSATION_FLAG' }), 'ADMIN');
  assert.equal(action?.label, 'Voir le signal');
  assert.equal(action?.href, '/admin/assistant');
});

void test('ADMIN_MESSAGE : lecture sur place, sans mission requise', () => {
  const action = getActionForNotification(
    notif({ type: 'ADMIN_MESSAGE', demandeId: null, reference: null }),
    'TECHNICIAN',
  );
  assert.equal(action?.label, 'Lire');
  assert.equal(action?.href, '/technicien/notifications');
});

void test('un type sans mapping ne propose AUCUN lien (jamais de route devinée)', () => {
  const action = getActionForNotification(notif({ type: 'TYPE_SANS_MAPPING' }), 'CLIENT');
  assert.equal(action?.label, '');
  assert.equal(action?.href, null);
  assert.equal(hasNavigableAction(action), false);
});

void test('une notification sans mission ne fabrique pas de lien vers « undefined »', () => {
  for (const role of ['CLIENT', 'TECHNICIAN'] as NotificationRole[]) {
    const action = getActionForNotification(
      notif({ type: 'QUOTE_CREATED', demandeId: null }),
      role,
    );
    assert.ok(action?.href === null || !action.href.includes('undefined'));
    assert.ok(!String(action?.href).includes('null'));
  }
});

void test('hasNavigableAction ne confond pas « objet présent » et « lien réel »', () => {
  assert.equal(hasNavigableAction(null), false);
  assert.equal(hasNavigableAction({ label: 'x', href: null }), false);
  assert.equal(hasNavigableAction({ label: 'x', href: '/a' }), true);
});

/* ── Regroupement par mission ───────────────────────────────────────────── */

void test('les notifications d’une même mission forment UN seul groupe', () => {
  const { groups, looseNotifications } = groupNotificationsByMission(
    [
      notif({ demandeId: 'd1', reference: 'RD-4821', type: 'COMPLETED' }),
      notif({ demandeId: 'd1', reference: 'RD-4821', type: 'QUOTE_ACCEPTED', read: true }),
      notif({ demandeId: 'd2', reference: 'RD-4999', type: 'CONFIRMED' }),
    ],
    'CLIENT',
  );

  assert.equal(groups.length, 2);
  const missionOne = groups.find((group) => group.key === 'd1');
  assert.ok(missionOne);
  assert.equal(missionOne.notifications.length, 2);
  assert.equal(missionOne.reference, 'RD-4821');
  assert.equal(looseNotifications.length, 0);
});

void test('le compteur du groupe ne compte que les NON LUES', () => {
  const { groups } = groupNotificationsByMission(
    [
      notif({ demandeId: 'd1', read: false }),
      notif({ demandeId: 'd1', read: true }),
      notif({ demandeId: 'd1', read: false }),
    ],
    'CLIENT',
  );
  assert.equal(groups[0].unreadCount, 2);
  assert.equal(groups[0].notifications.length, 3);
});

void test('les notifications SANS demandeId ne sont jamais regroupées', () => {
  const { groups, looseNotifications } = groupNotificationsByMission(
    [
      notif({ type: 'ADMIN_MESSAGE', demandeId: null, reference: null }),
      notif({ type: 'ADMIN_MESSAGE', demandeId: null, reference: null }),
      notif({ demandeId: 'd1' }),
    ],
    'TECHNICIAN',
  );

  assert.equal(groups.length, 1);
  // Les deux messages génériques sont à plat,PAS dans un faux groupe.
  assert.equal(looseNotifications.length, 2);
  for (const notification of looseNotifications) {
    assert.equal(notification.demandeId, null);
  }
});

void test('l’urgence du groupe est la plus haute de ses notifications', () => {
  const { groups } = groupNotificationsByMission(
    [
      notif({ demandeId: 'd1', type: 'MISSION_AVAILABLE' }), // INFO
      notif({ demandeId: 'd1', type: 'QUOTE_CREATED' }), // ACTION
      notif({ demandeId: 'd1', type: 'SCHEDULED' }), // FOLLOW_UP
    ],
    'CLIENT',
  );
  assert.equal(groups[0].urgency, 'ACTION');
});

void test('le groupe affiche la dernière action (notification la plus récente)', () => {
  // `items` est fourni dans l'ordre de l'API (plus récent d'abord) : la
  // dernière action est donc le PREMIER élément. Rôle technicien pour rester
  // sur des types qui ont réellement une action de ce côté.
  const { groups } = groupNotificationsByMission(
    [
      notif({ type: 'QUOTE_ACCEPTED', demandeId: 'd1', createdAt: '2026-10-11T10:00:00.000Z' }),
      notif({ type: 'NEGOTIATION_REQUESTED', demandeId: 'd1', createdAt: '2026-10-11T08:00:00.000Z' }),
    ],
    'TECHNICIAN',
  );
  assert.equal(groups[0].lastActionLabel, 'Voir la mission');
});

void test('une notification sans action possible → aucun libellé dans le groupe', () => {
  // `MISSION_AVAILABLE` n'a pas d'action côté client : le header du groupe ne
  // doit pas afficher de libellé vide.
  const { groups } = groupNotificationsByMission(
    [notif({ type: 'MISSION_AVAILABLE', demandeId: 'd1' })],
    'CLIENT',
  );
  assert.equal(groups[0].lastActionLabel, null);
});

void test('mission supprimée (reference null) → le groupe reste affichable', () => {
  const { groups } = groupNotificationsByMission(
    [notif({ demandeId: 'd1', reference: null })],
    'CLIENT',
  );
  assert.equal(groups[0].reference, null);
  assert.equal(groups[0].notifications.length, 1);
});

void test('sortNotifications : plus récent en premier', () => {
  const sorted = sortNotifications([
    notif({ createdAt: '2026-10-11T08:00:00.000Z' }),
    notif({ createdAt: '2026-10-11T12:00:00.000Z' }),
    notif({ createdAt: '2026-10-11T10:00:00.000Z' }),
  ]);
  assert.deepEqual(
    sorted.map((item) => item.createdAt),
    ['2026-10-11T12:00:00.000Z', '2026-10-11T10:00:00.000Z', '2026-10-11T08:00:00.000Z'],
  );
});

/* ── Règle FCFA : le formatage passe OBLIGATOIREMENT par formatFCFA ────── */

void test('aucun montant n’est formaté dans le mapping (le mapping ne formate rien)', () => {
  const mapping = read('./notification-mapping.ts');
  // Le mapping CHOISIT quoi afficher ; il ne convertit jamais un montant.
  assert.doesNotMatch(mapping, /toLocaleString/);
  assert.doesNotMatch(mapping, /\d{1,3}\s*FCFA/);
});

void test('l’item de notification formate ses montants via formatFCFA', () => {
  const item = read('../../components/ui/notification-item.tsx');
  assert.match(item, /import \{ formatFCFA \} from '@\/lib\/format-fcfa'/);
  assert.match(item, /formatFCFA\(metadata\.amountXAF\)/);
  assert.match(item, /formatFCFA\(metadata\.finalAmountXAF\)/);
  assert.match(item, /formatFCFA\(metadata\.maxAmountXAF\)/);
  // Aucune conversion locale : « 15 000 FCFA » doit venir de formatFCFA,
  // pas d'un toLocaleString local.
  assert.doesNotMatch(item, /amountXAF\.toLocaleString/);
});

/* ── Structure du centre (§ B.2 / B.3 / B.6 / B.9) ────────────────────── */

void test('le centre rend les 3 sections, un groupe et un item dédiés', () => {
  const center = read('../../components/notifications/notifications-center.tsx');
  // Sections vides masquées, ordre imposé par URGENCY_ORDER.
  assert.match(center, /URGENCY_ORDER\.map/);
  assert.match(center, /isSectionEmpty/);
  // Groupe collapsible + menu « marquer ce groupe comme lu ».
  assert.match(center, /aria-expanded=\{expanded\}/);
  assert.match(center, /Marquer ce groupe comme lu/);
  // État vide illustré (jamais une page blanche).
  assert.match(center, /title="Vous êtes à jour"/);
  assert.match(center, /EmptyState/);
  // Action globale.
  assert.match(center, /Tout marquer comme lu/);
});

void test('animation d’insertion SSE, désactivée si reduced-motion', () => {
  const center = read('../../components/notifications/notifications-center.tsx');
  assert.match(center, /useReducedMotion/);
  assert.match(center, /freshIds\.has\(notification\.id\) && !reduceMotion/);
  assert.match(center, /duration: 0\.2/);
  // Le module SSE (#2A) n'est pas modifié : le centre ne fait que s'y abonner.
  assert.match(center, /useUserStream/);
});

void test('le refetch temps réel ne se déclenche QUE sur notification.created', () => {
  // L'ancien composant rechargeait sur tout événement du flux utilisateur.
  const hook = read('./use-notifications-center.ts');
  assert.match(hook, /if \(message\.type !== 'notification\.created'\) return;/);
});

void test('l’ancien composant n’est pas en coexistence : une seule implémentation', () => {
  const center = read('../../components/notifications/notifications-center.tsx');
  // Plus de props `detailHref` / `hub` de l'ancienne variante.
  assert.doesNotMatch(center, /detailHref/);
  assert.doesNotMatch(center, /\bhub\b/);
  // Une seule fonction NotificationsCenter.
  assert.equal(center.match(/export function NotificationsCenter/g)?.length, 1);
});