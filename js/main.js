/* Torres Formation — interactions de page (sans dépendance) */
(function () {
  'use strict';

  // Adresse d'envoi du formulaire. Si le service ne répond pas,
  // la demande s'ouvre dans la messagerie du visiteur (secours).
  var EMAIL = 't.maicol.formation@gmail.com';
  var ENVOI = 'https://formsubmit.co/ajax/' + EMAIL;

  var doc = document.documentElement;
  doc.classList.add('js');

  var annee = document.getElementById('annee');
  if (annee) annee.textContent = new Date().getFullYear();

  // Logo d'accueil : si la 3D n'a pas démarré à temps (navigateur ancien, WebGL absent), le logo statique s'affiche.
  var visuel = document.getElementById('visuel');
  if (visuel) setTimeout(function () {
    if (!visuel.classList.contains('est-3d')) visuel.classList.add('sans-3d');
  }, 4000);

  // En-tête et fil rouge de lecture
  var entete = document.getElementById('entete');
  var trait = document.querySelector('.fil__trait');
  var attente = false;
  function surDefilement() {
    attente = false;
    var y = window.scrollY || 0;
    if (entete) entete.classList.toggle('est-defile', y > 24);
    var max = doc.scrollHeight - window.innerHeight;
    if (trait) trait.style.transform = 'scaleY(' + (max > 0 ? Math.min(1, y / max).toFixed(4) : 0) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!attente) { attente = true; requestAnimationFrame(surDefilement); }
  }, { passive: true });
  window.addEventListener('resize', surDefilement);
  surDefilement();

  // Menu mobile
  var bouton = document.getElementById('bouton-menu');
  var nav = document.getElementById('navigation');
  function fermer() {
    if (!nav || !bouton) return;
    nav.classList.remove('est-ouverte');
    bouton.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  if (bouton && nav) {
    bouton.addEventListener('click', function () {
      var ouvert = nav.classList.toggle('est-ouverte');
      bouton.setAttribute('aria-expanded', String(ouvert));
      document.body.style.overflow = ouvert ? 'hidden' : '';
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) fermer(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermer(); });
  }

  // Titres de bloc : apparition au défilement
  var tetes = document.querySelectorAll('.bloc__tete');
  if ('IntersectionObserver' in window) {
    var vue = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('est-vu'); vue.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    tetes.forEach(function (t) { vue.observe(t); });
  } else {
    tetes.forEach(function (t) { t.classList.add('est-vu'); });
  }

  // Avis Google : duplication automatique pour un défilement continu sans coupure
  var pisteAvis = document.getElementById('avis-piste');
  if (pisteAvis && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    Array.prototype.slice.call(pisteAvis.children).forEach(function (carte) {
      var clone = carte.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      pisteAvis.appendChild(clone);
    });
  }

  // Clic sur une carte formation -> pré-sélectionne la formation dans le formulaire
  var selectFormation = document.getElementById('f-formation');
  var sectionReserver = document.getElementById('reserver');
  document.querySelectorAll('.engin[data-formation]').forEach(function (carte) {
    function choisirFormation() {
      var nom = carte.getAttribute('data-formation');
      if (selectFormation && nom) {
        for (var i = 0; i < selectFormation.options.length; i++) {
          if (selectFormation.options[i].text === nom || selectFormation.options[i].value === nom) {
            selectFormation.selectedIndex = i;
            selectFormation.classList.remove('est-invalide');
            break;
          }
        }
      }
      if (sectionReserver) sectionReserver.scrollIntoView({ behavior: 'smooth' });
    }
    carte.addEventListener('click', choisirFormation);
    carte.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choisirFormation(); }
    });
  });

  // Planning des disponibilités en lecture seule (synchronisé avec l'API Agenda si clé disponible)
  var calGrille = document.getElementById('cal-grille');
  var calPeriode = document.getElementById('cal-periode');
  var btnPrec = document.getElementById('cal-prec');
  var btnSuiv = document.getElementById('cal-suiv');
  var champPeriode = document.getElementById('f-periode');
  if (calGrille && calPeriode) {
    var MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    var JOURS_SEM = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    var API_AGENDA = 'https://script.google.com/macros/s/AKfycbxMqAMr1-0ztIOjkgFMmLn5_-50ygoX4gZ9SWYYdSjsZICm-C4BxtEU21nAjXQQ270K/exec';
    var CLE_PUBLIC = window.TF_PUBLIC_KEY || '';
    try {
      var mem = JSON.parse(localStorage.getItem('tf:last') || 'null');
      if (!CLE_PUBLIC && mem && mem.k) CLE_PUBLIC = mem.k;
    } catch (e) { /* rien */ }

    var auj = new Date();
    var anneeBase = auj.getFullYear();
    var moisBase = auj.getMonth();
    var decalage = 0;
    var etatsJours = {};
    var feries = {};
    var jourChoisi = '';

    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function cleDate(a, m, j) { return a + '-' + pad2(m + 1) + '-' + pad2(j); }
    function formatDateFr(iso) {
      var p = iso.split('-');
      return parseInt(p[2], 10) + ' ' + MOIS[parseInt(p[1], 10) - 1].toLowerCase() + ' ' + p[0];
    }

    function feriesAnnee(an) {
      var f = {};
      f[an + '-01-01'] = 1; f[an + '-05-01'] = 1; f[an + '-05-08'] = 1;
      f[an + '-07-14'] = 1; f[an + '-08-15'] = 1; f[an + '-11-01'] = 1;
      f[an + '-11-11'] = 1; f[an + '-12-25'] = 1;
      // Pâques (algorithme de Butcher)
      var a = an % 19, b = Math.floor(an / 100), c = an % 100;
      var d = Math.floor(b / 4), e = b % 4, g = Math.floor((b + 8) / 25);
      var i = Math.floor((b - g + 1) / 3), h = (19 * a + b - d - i + 15) % 30;
      var k = Math.floor(c / 4), l = c % 4, m = (32 + 2 * e + 2 * k - h - l) % 7;
      var n = Math.floor((a + 11 * h + 22 * m) / 451);
      var moisP = Math.floor((h + m - 7 * n + 114) / 31);
      var jourP = ((h + m - 7 * n + 114) % 31) + 1;
      function ajoutJours(jDelta) {
        var dt = new Date(Date.UTC(an, moisP - 1, jourP + jDelta));
        return dt.toISOString().slice(0, 10);
      }
      f[ajoutJours(1)] = 1;   // Lundi de Pâques
      f[ajoutJours(39)] = 1;  // Ascension
      f[ajoutJours(50)] = 1;  // Lundi de Pentecôte
      return f;
    }
    Object.assign(feries, feriesAnnee(anneeBase), feriesAnnee(anneeBase + 1));

    var isoAuj = cleDate(auj.getFullYear(), auj.getMonth(), auj.getDate());

    function dessinerCalendrier() {
      var nbMois = window.innerWidth <= 860 ? 1 : 3;
      var html = '';
      var premierTitre = '', dernierTitre = '';

      for (var k = 0; k < nbMois; k++) {
        var dtMois = new Date(anneeBase, moisBase + decalage + k, 1);
        var an = dtMois.getFullYear(), mo = dtMois.getMonth();
        var nomMois = MOIS[mo] + ' ' + an;
        if (k === 0) premierTitre = nomMois;
        dernierTitre = nomMois;

        var premierJour = (new Date(an, mo, 1).getDay() + 6) % 7;
        var nbJours = new Date(an, mo + 1, 0).getDate();
        var libresMois = 0;
        var cellules = '';

        for (var v = 0; v < premierJour; v++) {
          cellules += '<span class="cal-j cal-j--vide"></span>';
        }
        for (var j = 1; j <= nbJours; j++) {
          var iso = cleDate(an, mo, j);
          var jourSem = (premierJour + j - 1) % 7;
          var estWe = jourSem >= 5;
          var estPasse = iso <= isoAuj;
          var etat = etatsJours[iso];
          var cls = 'cal-j ';
          var titre = '';
          var cliquable = false;

          if (estPasse || estWe || feries[iso]) {
            cls += 'cal-j--off';
            titre = feries[iso] ? 'Jour férié' : (estWe ? 'Week-end' : 'Passé');
          } else if (etat && etat.s === 'x') {
            cls += 'cal-j--pris';
            titre = 'Déjà réservé';
          } else if (etat && etat.s === 'o') {
            cls += 'cal-j--option';
            titre = 'Option en cours — cliquez pour demander cette date';
            cliquable = true;
            libresMois++;
          } else {
            cls += 'cal-j--libre';
            titre = 'Disponible — cliquez pour demander cette date';
            cliquable = true;
            libresMois++;
          }
          if (jourChoisi === iso) cls += ' cal-j--choisi';

          cellules += '<span class="' + cls + '"'
            + (cliquable ? ' data-date="' + iso + '" role="button" tabindex="0"' : '')
            + ' title="' + titre + '" aria-label="' + j + ' ' + MOIS[mo] + ' : ' + titre + '">' + j + '</span>';
        }

        html += '<div class="cal-mois">'
          + '<div class="cal-mois__titre"><span>' + MOIS[mo] + ' ' + an + '</span><small>' + libresMois + ' j. ouvrés dispo</small></div>'
          + '<div class="cal-semaine">' + JOURS_SEM.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>'
          + '<div class="cal-jours">' + cellules + '</div>'
          + '</div>';
      }

      calGrille.innerHTML = html;
      calPeriode.textContent = premierTitre === dernierTitre ? premierTitre : premierTitre + ' — ' + dernierTitre;
      if (btnPrec) btnPrec.disabled = decalage <= 0;
      if (btnSuiv) btnSuiv.disabled = decalage >= 9;
    }

    calGrille.addEventListener('click', function (e) {
      var cel = e.target.closest('[data-date]');
      if (!cel) return;
      jourChoisi = cel.getAttribute('data-date');
      dessinerCalendrier();
      if (champPeriode) {
        var actuel = champPeriode.value.trim();
        var libelle = 'À partir du ' + formatDateFr(jourChoisi);
        champPeriode.value = actuel && actuel.indexOf('À partir du') === -1 ? actuel + ' (' + libelle + ')' : libelle;
      }
      if (sectionReserver) sectionReserver.scrollIntoView({ behavior: 'smooth' });
    });

    calGrille.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var cel = e.target.closest('[data-date]');
        if (cel) { e.preventDefault(); cel.click(); }
      }
    });

    if (btnPrec) btnPrec.addEventListener('click', function () { if (decalage > 0) { decalage--; dessinerCalendrier(); } });
    if (btnSuiv) btnSuiv.addEventListener('click', function () { if (decalage < 9) { decalage++; dessinerCalendrier(); } });
    window.addEventListener('resize', dessinerCalendrier);
    dessinerCalendrier();

    // Si une clé de lecture est configurée ou présente, on synchronise les jours réservés
    if (CLE_PUBLIC) {
      fetch(API_AGENDA, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ a: 'init', k: CLE_PUBLIC, p: {} })
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (res && res.ok && res.data && res.data.days) {
          etatsJours = res.data.days;
          if (res.data.feries) Object.assign(feries, res.data.feries);
          dessinerCalendrier();
        }
      }).catch(function () { /* garde l'affichage des jours ouvrés */ });
    }
  }

  // Formulaire de demande
  var form = document.getElementById('formulaire');
  var etat = document.getElementById('etat');
  if (!form || !etat) return;

  function message(texte, erreur) {
    etat.textContent = texte;
    etat.classList.toggle('est-erreur', !!erreur);
  }

  function valider() {
    var premier = null;
    form.querySelectorAll('[required]').forEach(function (c) {
      var bon = c.checkValidity();
      c.classList.toggle('est-invalide', !bon);
      c.setAttribute('aria-invalid', String(!bon));
      if (!bon && !premier) premier = c;
    });
    if (premier) {
      message(premier.type === 'email'
        ? 'Vérifiez l\'adresse e-mail.'
        : 'Remplissez les champs signalés pour envoyer la demande.', true);
      premier.focus();
    }
    return !premier;
  }

  form.addEventListener('input', function (e) {
    if (e.target.classList.contains('est-invalide') && e.target.checkValidity()) {
      e.target.classList.remove('est-invalide');
      e.target.setAttribute('aria-invalid', 'false');
    }
  });

  function lienSecours(d) {
    var corps = [
      'Entreprise : ' + d.entreprise,
      'Nom : ' + d.nom,
      'E-mail : ' + d.email,
      'Téléphone : ' + (d.telephone || ''),
      'Formation : ' + d.formation,
      'Lieu : ' + d.lieu,
      'Ville et période : ' + (d.periode || ''),
      '',
      d.message || ''
    ].join('\n');
    return 'mailto:' + EMAIL
      + '?subject=' + encodeURIComponent('Demande de session - ' + d.entreprise)
      + '&body=' + encodeURIComponent(corps);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!valider()) return;
    var d = {};
    new FormData(form).forEach(function (v, k) { d[k] = String(v).trim(); });
    if (d._honey) { form.reset(); message('Demande envoyée.'); return; } // robot

    var envoyer = form.querySelector('button[type=submit]');
    envoyer.disabled = true;
    message('Envoi en cours…');

    var controle = ('AbortController' in window) ? new AbortController() : null;
    var delai = setTimeout(function () { if (controle) controle.abort(); }, 12000);

    fetch(ENVOI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      signal: controle ? controle.signal : undefined,
      body: JSON.stringify({
        _subject: 'Demande de session - ' + d.entreprise,
        _template: 'table',
        _captcha: 'false',
        _replyto: d.email,
        Entreprise: d.entreprise,
        Nom: d.nom,
        'E-mail': d.email,
        'Téléphone': d.telephone || 'Non renseigné',
        Formation: d.formation,
        Lieu: d.lieu,
        'Ville et période': d.periode || 'Non renseigné',
        Précisions: d.message || 'Aucune'
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || String(j.success) === 'false') throw new Error('refus');
      });
    }).then(function () {
      form.reset();
      message('Demande envoyée. Je vous réponds rapidement avec un devis.');
    }).catch(function () {
      etat.classList.add('est-erreur');
      etat.textContent = 'L\'envoi n\'a pas abouti. ';
      var a = document.createElement('a');
      a.href = lienSecours(d);
      a.textContent = 'Envoyer la demande par e-mail';
      etat.appendChild(a);
      etat.appendChild(document.createTextNode(' ou appelez le 06 29 44 49 97.'));
    }).then(function () {
      clearTimeout(delai);
      envoyer.disabled = false;
    });
  });
})();
