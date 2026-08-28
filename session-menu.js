// RepairDom — Menu de navigation selon l'état connecté / déconnecté.
//
// Ce script est chargé sur toutes les pages (après auth.js). Il ajuste la
// barre de navigation :
//   - déconnecté : affiche "S'inscrire" et "Se connecter"
//   - connecté   : affiche le nom de l'utilisateur et "Se déconnecter"

(function () {
  var nav = document.querySelector('.nav');
  if (!nav || !window.RepairAuth) return;

  function appendLink(href, text) {
    var a = document.createElement('a');
    a.href = href;
    a.className = 'nav-link';
    a.textContent = text;
    nav.appendChild(a);
    nav.appendChild(document.createTextNode(' '));
    return a;
  }

  function onMenuClick(handler) {
    // Ferme le menu mobile après un clic (comportement des autres liens).
    nav.querySelectorAll('.nav-link').forEach(function (link) {
      link.style.cursor = 'pointer';
    });
  }

  if (window.RepairAuth.isLoggedIn()) {
    // Masque/traduit le lien "S'inscrire" existant, s'il est présent.
    var signup = Array.prototype.find.call(nav.querySelectorAll('.nav-link'),
      function (l) { return /inscrire/i.test(l.textContent); });
    if (signup) signup.style.display = 'none';

    var name = window.RepairAuth.getUserName();
    if (name) appendLink('#', '👤 ' + name);
    var logoutLink = appendLink('#', 'Se déconnecter');
    logoutLink.addEventListener('click', function (e) {
      e.preventDefault();
      window.RepairAuth.logout();
    });
  } else {
    var hasLogin = Array.prototype.some.call(nav.querySelectorAll('.nav-link'),
      function (l) { return /connexion|se connecter/i.test(l.textContent); });
    if (!hasLogin) appendLink('login.html', 'Se connecter');
  }

  onMenuClick();
})();
