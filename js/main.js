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

  // Thème clair / sombre : mémorisé, appliqué avant l'affichage (voir <head>), bascule en cercle depuis le bouton
  var bascule = document.getElementById('bascule');
  var metaTheme = document.querySelector('meta[name="theme-color"]');
  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function refleterTheme() {
    var clair = doc.dataset.theme === 'clair';
    if (bascule) {
      bascule.setAttribute('aria-pressed', String(clair));
      bascule.setAttribute('aria-label', clair ? 'Passer en thème sombre' : 'Passer en thème clair');
    }
    if (metaTheme) metaTheme.setAttribute('content', clair ? '#EDEAE4' : '#0B0B0C');
  }
  function changerTheme(ev) {
    var versClair = doc.dataset.theme !== 'clair';
    function appliquer() {
      if (versClair) doc.dataset.theme = 'clair'; else delete doc.dataset.theme;
      try { localStorage.setItem('tf:theme', versClair ? 'clair' : 'sombre'); } catch (e) { /* rien */ }
      refleterTheme();
      document.dispatchEvent(new Event('tf:theme'));
    }
    if (!document.startViewTransition || calme) { appliquer(); return; }
    var r = bascule.getBoundingClientRect();
    var x = ev && ev.clientX ? ev.clientX : r.left + r.width / 2;
    var y = ev && ev.clientY ? ev.clientY : r.top + r.height / 2;
    var rayon = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.startViewTransition(appliquer).ready.then(function () {
      doc.animate({ clipPath: ['circle(0 at ' + x + 'px ' + y + 'px)', 'circle(' + rayon + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 700, easing: 'cubic-bezier(.2,.75,.2,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () { /* transition annulée : le thème est déjà appliqué */ });
  }
  if (bascule) bascule.addEventListener('click', changerTheme);
  refleterTheme();

  // Apparitions au défilement : titres de bloc, puis éléments de chaque grille, en cascade
  var tetes = document.querySelectorAll('.bloc__tete');
  var groupes = ['.engins', '.atouts', '.etapes', '.regions', '.questions', '.coordonnees', '.avis-actions'];
  var apparus = [];
  groupes.forEach(function (sel) {
    var g = document.querySelector(sel);
    if (!g) return;
    Array.prototype.forEach.call(g.children, function (el, i) { el.classList.add('r'); el.style.setProperty('--i', i % 8); apparus.push(el); });
  });
  ['.planning', '.engins__note', '.formulaire', '.avis-defile'].forEach(function (sel) {
    var el = document.querySelector(sel);
    if (el) { el.classList.add('r'); apparus.push(el); }
  });
  var radar = document.getElementById('radar');
  var aVoir = Array.prototype.slice.call(tetes).concat(apparus, radar ? [radar] : []);
  if ('IntersectionObserver' in window) {
    var vue = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('est-vu'); vue.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    aVoir.forEach(function (t) { vue.observe(t); });
  } else {
    aVoir.forEach(function (t) { t.classList.add('est-vu'); });
  }

  // Cartes formation : un halo discret suit le pointeur
  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.engin').forEach(function (carte) {
      carte.addEventListener('pointermove', function (e) {
        var r = carte.getBoundingClientRect();
        carte.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        carte.style.setProperty('--my', (e.clientY - r.top) + 'px');
      }, { passive: true });
    });
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

  // Planning des disponibilités : lu en direct dans l'agenda (lecture seule, aucune donnée privée)
  var calGrille = document.getElementById('cal-grille');
  var calPeriode = document.getElementById('cal-periode');
  var btnPrec = document.getElementById('cal-prec');
  var btnSuiv = document.getElementById('cal-suiv');
  var champPeriode = document.getElementById('f-periode');
  if (calGrille && calPeriode) {
    var MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    var JOURS_SEM = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    var API_AGENDA = 'https://script.google.com/macros/s/AKfycbxMqAMr1-0ztIOjkgFMmLn5_-50ygoX4gZ9SWYYdSjsZICm-C4BxtEU21nAjXQQ270K/exec';
    var CACHE = 'tf:dispo', FRAIS = 5 * 60 * 1000, PERIME = 36 * 3600 * 1000;
    var calEtat = document.getElementById('cal-etat');
    var calEtatTexte = document.getElementById('cal-etat-texte');
    var prochaine = document.getElementById('prochaine');
    var prochaineDate = document.getElementById('prochaine-date');

    var auj = new Date();
    var anneeBase = auj.getFullYear();
    var moisBase = auj.getMonth();
    var decalage = 0;
    var donnees = null;        // { t: instant du relevé, days: {...}, feries: {...}, maxDay }
    var neuf = true;           // joue l'animation de pose des jours une seule fois par chargement de données
    var jourChoisi = '';

    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function cleDate(a, m, j) { return a + '-' + pad2(m + 1) + '-' + pad2(j); }
    function dateDe(iso) { var p = iso.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
    function formatDateFr(iso) {
      var d = dateDe(iso);
      return JOURS[d.getDay()] + ' ' + d.getDate() + (d.getDate() === 1 ? 'er' : '') + ' ' + MOIS[d.getMonth()].toLowerCase()
        + (d.getFullYear() !== anneeBase ? ' ' + d.getFullYear() : '');
    }
    var isoAuj = cleDate(auj.getFullYear(), auj.getMonth(), auj.getDate());

    function dessinerCalendrier() {
      var nbMois = window.innerWidth <= 860 ? 1 : 3;
      var html = '';
      var premierTitre = '', dernierTitre = '';
      var jours = donnees ? donnees.days || {} : null;
      var feries = donnees ? donnees.feries || {} : {};
      var fin = donnees && donnees.maxDay ? donnees.maxDay : '9999';

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

        for (var v = 0; v < premierJour; v++) cellules += '<span class="cal-j cal-j--vide"></span>';
        for (var j = 1; j <= nbJours; j++) {
          var iso = cleDate(an, mo, j);
          var estWe = (premierJour + j - 1) % 7 >= 5;
          var etat = jours ? jours[iso] : null;
          var cls = 'cal-j ', titre = '', cliquable = false;

          if (iso <= isoAuj || iso > fin) {
            cls += 'cal-j--off'; titre = iso === isoAuj ? 'Aujourd\'hui' : (iso > fin ? 'Pas encore ouvert' : 'Passé');
            if (iso === isoAuj) cls += ' cal-j--auj';
          } else if (!jours) {
            cls += 'cal-j--attente'; titre = 'Lecture de l\'agenda…';
          } else if (etat && etat.s === 'x') {
            cls += 'cal-j--pris'; titre = 'Indisponible';
          } else if (etat && etat.s === 'o') {
            cls += 'cal-j--option'; titre = 'Option en cours : demande possible'; cliquable = true;
          } else {
            cls += 'cal-j--libre'; cliquable = true;
            if (estWe || feries[iso]) { cls += ' cal-j--we'; titre = (feries[iso] ? 'Jour férié' : 'Week-end') + ' : libre, sur demande'; }
            else { titre = 'Libre : touchez pour demander cette date'; libresMois++; }
          }
          if (jourChoisi === iso) cls += ' cal-j--choisi';

          cellules += '<span class="' + cls + '" style="--n:' + (k * 31 + j) + '"'
            + (cliquable ? ' data-date="' + iso + '" role="button" tabindex="0"' : '')
            + ' title="' + titre + '" aria-label="' + j + ' ' + MOIS[mo] + ' : ' + titre + '">' + j + '</span>';
        }

        html += '<div class="cal-mois">'
          + '<div class="cal-mois__titre"><span>' + nomMois + '</span><small>' + (jours ? libresMois + ' j. ouvrés libres' : '') + '</small></div>'
          + '<div class="cal-semaine">' + JOURS_SEM.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>'
          + '<div class="cal-jours' + (jours && neuf ? ' est-neuf' : '') + '">' + cellules + '</div>'
          + '</div>';
      }
      if (jours) neuf = false;

      calGrille.innerHTML = html;
      calPeriode.textContent = premierTitre === dernierTitre ? premierTitre : premierTitre + ' à ' + dernierTitre;
      if (btnPrec) btnPrec.disabled = decalage <= 0;
      if (btnSuiv) btnSuiv.disabled = decalage >= 9;
    }

    // Prochain jour ouvré entièrement libre, affiché en haut de page
    function majProchaine() {
      if (!prochaine || !prochaineDate) return;
      if (!donnees) { prochaine.hidden = true; return; }
      var d = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate());
      for (var n = 0; n < 200; n++) {
        d.setDate(d.getDate() + 1);
        var iso = cleDate(d.getFullYear(), d.getMonth(), d.getDate());
        var js = d.getDay();
        if (js === 0 || js === 6 || (donnees.feries || {})[iso] || (donnees.days || {})[iso]) continue;
        prochaineDate.textContent = formatDateFr(iso);
        prochaine.hidden = false;
        return;
      }
      prochaine.hidden = true;
    }

    function majEtat(erreur) {
      if (!calEtat || !calEtatTexte) return;
      var hors = !donnees || erreur;
      calEtat.classList.toggle('est-hors-ligne', !!hors);
      if (prochaine) prochaine.classList.toggle('est-hors-ligne', !!hors);
      if (!donnees) {
        calEtatTexte.textContent = erreur ? 'Agenda injoignable pour le moment' : 'Connexion à l\'agenda…';
        return;
      }
      var h = new Date(donnees.t);
      var quand = h.toDateString() === new Date().toDateString()
        ? 'à ' + pad2(h.getHours()) + ' h ' + pad2(h.getMinutes())
        : 'le ' + h.getDate() + ' ' + MOIS[h.getMonth()].toLowerCase();
      calEtatTexte.textContent = (erreur ? 'Dernier relevé de l\'agenda ' : 'En direct de l\'agenda, relevé ') + quand;
    }

    function recevoir(d, erreur) {
      donnees = d; neuf = neuf && !!d;
      dessinerCalendrier(); majProchaine(); majEtat(erreur);
    }

    var enCours = false;
    function lireAgenda() {
      if (enCours || document.hidden) return;
      enCours = true;
      var controle = ('AbortController' in window) ? new AbortController() : null;
      var delai = setTimeout(function () { if (controle) controle.abort(); }, 20000);
      fetch(API_AGENDA, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        signal: controle ? controle.signal : undefined,
        body: JSON.stringify({ a: 'dispo', k: '', p: {} })
      }).then(function (r) { return r.json(); }).then(function (res) {
        if (!res || !res.ok || !res.data || !res.data.days) throw new Error('reponse');
        var d = { t: Date.now(), days: res.data.days, feries: res.data.feries || {}, maxDay: res.data.maxDay || '' };
        try { localStorage.setItem(CACHE, JSON.stringify(d)); } catch (e) { /* stockage indisponible */ }
        recevoir(d, false);
      }).catch(function () {
        recevoir(donnees, true);
      }).then(function () { clearTimeout(delai); enCours = false; });
    }

    calGrille.addEventListener('click', function (e) {
      var cel = e.target.closest('[data-date]');
      if (!cel) return;
      jourChoisi = cel.getAttribute('data-date');
      dessinerCalendrier();
      if (champPeriode) {
        var actuel = champPeriode.value.replace(/\s*\(?À partir du [^)]*\)?$/, '').trim();
        var libelle = 'À partir du ' + formatDateFr(jourChoisi);
        champPeriode.value = actuel ? actuel + ' (' + libelle + ')' : libelle;
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
    var largeurVue = window.innerWidth;
    window.addEventListener('resize', function () {
      if ((largeurVue <= 860) !== (window.innerWidth <= 860)) dessinerCalendrier();
      largeurVue = window.innerWidth;
    });

    // Dernier relevé connu : affiché tout de suite, puis remplacé par la lecture en direct.
    try {
      var mem = JSON.parse(localStorage.getItem(CACHE) || 'null');
      if (mem && mem.t && mem.days && Date.now() - mem.t < PERIME) donnees = mem;
    } catch (e) { /* rien */ }
    recevoir(donnees, false);
    lireAgenda();
    setInterval(function () { if (!donnees || Date.now() - donnees.t > FRAIS) lireAgenda(); }, 60000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && (!donnees || Date.now() - donnees.t > FRAIS)) lireAgenda();
    });
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
