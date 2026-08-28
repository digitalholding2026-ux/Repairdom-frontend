// RepairDom — Menu de navigation dynamique selon l'état de session.
//
// Génère les liens de la barre de navigation (#mainNav) en fonction de
// l'état connecté / déconnecté et du rôle de l'utilisateur.

(function () {
  var nav = document.getElementById('mainNav');
  if (!nav) return;

  function currentPage() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path.toLowerCase();
  }

  function isLoggedIn() {
    return localStorage.getItem('token') !== null;
  }

  function getUserRole() {
    var role = localStorage.getItem('userRole');
    if (!role) return null;
    return String(role).toLowerCase() === 'technicien' ? 'technician' : String(role).toLowerCase();
  }

  window.handleLogout = function () {
    fetch(API_URL + '/api/logout', { method: 'POST' })
      .catch(function () {})
      .finally(function () {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        window.location.href = 'index.html';
      });
  };

  function renderNav() {
    var isIn = isLoggedIn();
    var role = getUserRole();
    var page = currentPage();

    var html = [
      link('index.html', 'Accueil'),
      link('client-depot.html', 'Déposer une panne'),
      link('tech-liste.html', 'Techniciens')
    ].join('');

    if (isIn) {
      html += link('suivi-mission.html', 'Mes missions');
      if (role === 'technician') {
        html += link('dashboard-technicien.html', 'Tableau de bord');
      }
      html += userChip();
    } else {
      html += link('register.html', "S'inscrire") + link('login.html', 'Se connecter');
    }

    nav.innerHTML = html;
  }

  function initials(name) {
    if (!name) return '?';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); })
      .join('');
  }

  function userChip() {
    var name = localStorage.getItem('userName') || 'Utilisateur';
    var role = getUserRole();
    var roleLabel = role === 'technician' ? 'Technicien' : 'Client';
    return (
      '<div class="nav-user">' +
        '<span class="nav-avatar">' + initials(name) + '</span>' +
        '<span class="nav-user-name">' + name + '</span>' +
        '<span class="nav-badge">' + roleLabel + '</span>' +
      '</div>' +
      '<button onclick="handleLogout()" class="btn btn-outline btn-sm">Déconnexion</button>'
    );
  }

  function link(href, text) {
    var page = currentPage();
    var active = page === href ? ' nav-link active' : ' nav-link';
    return '<a href="' + href + '" class="' + active + '">' + text + '</a>';
  }

  function closeMenu(toggle) {
    if (!nav.classList.contains('open')) return;
    nav.classList.remove('open');
    if (toggle) toggle.textContent = '\u2630';
  }

  function initMenuToggle() {
    var toggle = document.querySelector('.menu-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.textContent = open ? '\u2715' : '\u2630';
    });
    // Ferme le menu mobile après un clic sur un lien généré dynamiquement.
    nav.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('a')) {
        closeMenu(toggle);
      }
    });
  }

  renderNav();
  initMenuToggle();
})();
