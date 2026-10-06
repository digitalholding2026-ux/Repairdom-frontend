import { redirect } from 'next/navigation';

/* Chantier D2 — `/client/demande` n'existe plus.
 *
 * La page de création de demande est devenue PUBLIQUE et vit à `/demande` :
 * sous `/client`, elle était inaccessible aux visiteurs sans compte (le
 * `RoleGuard` du layout les renvoyait vers `/client/connexion`).
 *
 * Ce redirect évite les 404 sur les signets et les liens externes déjà
 * diffusés (landing, header, e-mails, partage). `redirect()` côté serveur est
 * permanent côté navigateur : le bookmark est réparé une fois pour toutes.
 *
 * ⚠️ Aucun `RoleGuard` ici, et il n'en faut pas : le redirect part avant
 * tout rendu, donc un visiteur anonyme comme un client connecté sont
 * renvoyés vers la même page publique. */

export default function LegacyClientDemandePage() {
  redirect('/demande');
}