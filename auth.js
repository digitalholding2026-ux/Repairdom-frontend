// RepairDom — Gestion de session (connexion / déconnexion)
//
// Les données de session sont stockées dans localStorage :
//   - token    : jeton d'authentification (présence = connecté)
//   - userName : nom de l'utilisateur connecté
//   - userRole : rôle de l'utilisateur ('client' | 'technician')
//   - userId   : identifiant de l'utilisateur connecté

const SESSION_KEYS = {
  token: 'token',
  userName: 'userName',
  userRole: 'userRole',
  userId: 'userId'
};

/** Renvoie le jeton JWT stocké, ou null s'il est absent. */
function getToken() {
  return localStorage.getItem(SESSION_KEYS.token);
}

/**
 * Vérifie côté client si le JWT stocké est expiré (décode le payload `exp`).
 * Retourne true si le token est expiré ou malformé (non-JWT).
 */
function isTokenExpired() {
  const token = getToken();
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true; // ce n'est pas un vrai JWT → non fiable
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch (_) {
    return false;
  }
}

/** True si un token de session est présent. */
function isLoggedIn() {
  return !!getToken();
}

/** Supprime toutes les clés de session locale (sans redirection). */
function clearSession() {
  localStorage.removeItem(SESSION_KEYS.token);
  localStorage.removeItem(SESSION_KEYS.userName);
  localStorage.removeItem(SESSION_KEYS.userRole);
  localStorage.removeItem(SESSION_KEYS.userId);
}

/** Retourne le rôle ('client' | 'technician') ou null si absent. */
function getUserRole() {
  const role = localStorage.getItem(SESSION_KEYS.userRole);
  if (!role) return null;
  // Normalise les variantes en anglais canonique.
  const normalized = String(role).toLowerCase() === 'technicien' ? 'technician' : String(role).toLowerCase();
  return (normalized === 'client' || normalized === 'technician') ? normalized : null;
}

/** Supprime la session locale puis recharge la page. */
function logout() {
  // Notifie le backend (stateless), puis efface la session côté client.
  try {
    fetch(API_URL + '/api/logout', { method: 'POST' }).catch(function () {});
  } catch (_) {}
  clearSession();
  window.location.href = 'index.html';
}

/**
 * Appelé quand un appel API échoue en 401 (token absent, expiré ou invalide).
 * Efface la session et redirige vers la page de connexion.
 */
function handleAuthFailure() {
  clearSession();
  window.location.href = 'login.html';
}

/** Construit l'en-tête d'authentification Bearer si un token est présent. */
function authHeaders(extra) {
  const headers = Object.assign({}, extra || {});
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

/** Stocke la session locale (connexion / inscription réussies). */
function saveSession({ token, userName, userRole, userId }) {
  if (token) localStorage.setItem(SESSION_KEYS.token, token);
  if (userName) localStorage.setItem(SESSION_KEYS.userName, userName);
  if (userRole) localStorage.setItem(SESSION_KEYS.userRole, userRole);
  if (userId) localStorage.setItem(SESSION_KEYS.userId, userId);
}

/** Renvoie le nom de l'utilisateur connecté ou null. */
function getUserName() {
  return localStorage.getItem(SESSION_KEYS.userName);
}

/** Renvoie l'identifiant de l'utilisateur connecté ou null. */
function getUserId() {
  return localStorage.getItem(SESSION_KEYS.userId);
}

window.RepairAuth = {
  getToken,
  isTokenExpired,
  isLoggedIn,
  getUserRole,
  getUserName,
  getUserId,
  saveSession,
  logout,
  clearSession,
  handleAuthFailure,
  authHeaders
};
