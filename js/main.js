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
