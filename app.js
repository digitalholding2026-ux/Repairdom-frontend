// RepairDom — frontend (client)
// Gestionnaire API centralisé pour tous les appels vers le backend.
//
// API_URL pointe vers le backend Railway. Ce site étant statique (Vercel),
// la variable d'environnement ne peut pas être lue côté navigateur au runtime :
// elle est donc injectée au BUILD via le placeholder __API_URL__ (remplacé par
// Vercel), avec repli sur l'URL publique de production.
//
// Priorité de résolution :
//   1. window.API_URL          → surcharge manuelle en local / debug
//   2. __API_URL__             → valeur encodée au build (variables Vercel)
//   3. DEFAULT_API_URL         → repli sur l'URL publique du backend

const BUILT_API_URL = '__API_URL__';
const DEFAULT_API_URL = 'https://repairdom-backend-production.up.railway.app';

const API_URL = (
  window.API_URL
  || (BUILT_API_URL.startsWith('__') ? DEFAULT_API_URL : BUILT_API_URL)
).replace(/\/+$/, '');

async function api(path, options = {}) {
  const url = API_URL + path;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    let msg = 'Erreur réseau.';
    try { const d = await res.json(); msg = d.error || msg; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

window.RepairDomAPI = {
  API_URL,
  api,
  get: (p) => api(p),
  post: (p, body) => api(p, { method: 'POST', body: JSON.stringify(body) }),
  patch: (p, body) => api(p, { method: 'PATCH', body: JSON.stringify(body) })
};
