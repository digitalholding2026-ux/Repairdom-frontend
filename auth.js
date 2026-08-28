// RepairDom — Gestion de session (connexion / déconnexion)
//
// Les données de session sont stockées dans localStorage :
//   - token    : jeton d'authentification (présence = connecté)
//   - userName : nom de l'utilisateur connecté
//   - userRole : rôle de l'utilisateur ('client' | 'technician')

const SESSION_KEYS = {
  token: 'token',
  userName: 'userName',
  userRole: 'userRole'
};

/** True si un token de session est présent. */
function isLoggedIn() {
  return !!localStorage.getItem(SESSION_KEYS.token);
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
  localStorage.removeItem(SESSION_KEYS.token);
  localStorage.removeItem(SESSION_KEYS.userName);
  localStorage.removeItem(SESSION_KEYS.userRole);
  window.location.reload();
}

/** Stocke la session locale (connexion / inscription réussies). */
function saveSession({ token, userName, userRole }) {
  if (token) localStorage.setItem(SESSION_KEYS.token, token);
  if (userName) localStorage.setItem(SESSION_KEYS.userName, userName);
  if (userRole) localStorage.setItem(SESSION_KEYS.userRole, userRole);
}

/** Renvoie le nom de l'utilisateur connecté ou null. */
function getUserName() {
  return localStorage.getItem(SESSION_KEYS.userName);
}

window.RepairAuth = {
  isLoggedIn,
  getUserRole,
  getUserName,
  saveSession,
  logout
};
