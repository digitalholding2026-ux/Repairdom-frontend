// RepairDom — Système de toasts partagé.
//
// Affiche une notification en bas à droite et la fait disparaître
// automatiquement après 4 secondes. Crée le conteneur s'il est absent.

(function () {
  function ensureContainer() {
    var c = document.getElementById('toastContainer');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      c.id = 'toastContainer';
      document.body.appendChild(c);
    }
    return c;
  }

  window.showToast = function (msg, type) {
    var c = ensureContainer();
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    t.textContent = msg;
    c.appendChild(t);
    // Durée d'affichage ~4s (3.7s + fondu de sortie de 0.3s).
    setTimeout(function () { t.classList.add('removing'); }, 3700);
    setTimeout(function () { t.remove(); }, 4000);
  };
})();
