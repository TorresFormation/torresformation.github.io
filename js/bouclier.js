/* Torres Formation — bouclier T en 3D (three.js, fourni localement).
   Si WebGL manque ou plante, le logo SVG reste affiché : aucune page cassée. */
import * as THREE from '../vendor/three.module.min.js';

const boite = document.getElementById('visuel');
const toile = document.getElementById('scene');
const calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function demarrer() {
  let rendu;
  try {
    rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }

  const petit = window.matchMedia('(max-width: 860px)');
  rendu.setPixelRatio(Math.min(window.devicePixelRatio || 1, petit.matches ? 1.5 : 2));
  rendu.outputColorSpace = THREE.SRGBColorSpace;
  rendu.toneMapping = THREE.ACESFilmicToneMapping;
  rendu.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 6.3);

  // Lumières : une clé qui suit le pointeur, un contre-jour froid, une ambiance basse.
  scene.add(new THREE.HemisphereLight(0xedeae4, 0x0b0b0c, 0.35));
  const cle = new THREE.DirectionalLight(0xfff6ea, 2.6);
  cle.position.set(-3.5, 4, 6);
  scene.add(cle);
  const contre = new THREE.DirectionalLight(0xa9b0bc, 1.4);
  contre.position.set(5, -1, -3);
  scene.add(contre);
  const balayage = new THREE.PointLight(0xffffff, 0, 12, 1.6);
  scene.add(balayage);

  // Studio de reflets, fabriqué sur place (aucun fichier image à charger) :
  // une pièce sombre avec quelques panneaux lumineux que le métal reflète.
  (function studio() {
    const piece = new THREE.Scene();
    const mur = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x0d0d0f, side: THREE.BackSide }));
    piece.add(mur);
    const panneau = (l, h, x, y, z, force, teinte) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(l, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(teinte).multiplyScalar(force), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); piece.add(m);
    };
    panneau(7, 3, -5, 6, 5, 9, 0xfff3e2);     // grande boîte à lumière, haut gauche
    panneau(1.2, 9, 7, 1, 3, 6, 0xffffff);    // bandeau vertical à droite
    panneau(9, 0.8, 0, -6, 6, 2.5, 0xedeae4); // rappel bas
    panneau(4, 4, 2, 3, -8, 3, 0xa9b0bc);     // contre-jour froid
    panneau(1.5, 1.5, -8, -2, 2, 4, 0xc8c2b8);
    const pm = new THREE.PMREMGenerator(rendu);
    scene.environment = pm.fromScene(piece, 0.03).texture;
    pm.dispose();
    piece.traverse((o) => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } });
  })();

  // Textures de matière dessinées à la volée : métal brossé et pierre.
  let graine = 7;
  const alea = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  function texture(dessin, repete) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    dessin(c.getContext('2d'), 512);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repete, repete);
    t.anisotropy = Math.min(8, rendu.capabilities.getMaxAnisotropy());
    return t;
  }
  // Métal brossé : fines stries verticales, quelques rayures franches.
  const brosse = texture((x, n) => {
    x.fillStyle = '#8c8c8c'; x.fillRect(0, 0, n, n);
    for (let i = 0; i < 5200; i++) {
      const g = 90 + alea() * 110 | 0;
      x.strokeStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + (0.1 + alea() * 0.25) + ')';
      x.lineWidth = 0.4 + alea() * 1.1;
      const px = alea() * n, py = alea() * n, l = 40 + alea() * 260, d = (alea() - 0.5) * 5;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + d, py + l); x.stroke();
      if (py + l > n) { x.beginPath(); x.moveTo(px, py - n); x.lineTo(px + d, py + l - n); x.stroke(); }
    }
    for (let i = 0; i < 40; i++) {
      x.strokeStyle = alea() > 0.5 ? 'rgba(235,235,235,.3)' : 'rgba(40,40,40,.28)';
      x.lineWidth = 0.3 + alea() * 0.4;
      const px = alea() * n, py = alea() * n, a = alea() * Math.PI, l = 8 + alea() * 40;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
  }, 1.4);
  // Pierre : grain irrégulier, taches larges, petits éclats.
  const pierre = texture((x, n) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
    const tache = (r, a) => {
      const px = alea() * n, py = alea() * n, g = alea() > 0.5 ? 255 : 0;
      for (const [ox, oy] of [[0, 0], [n, 0], [-n, 0], [0, n], [0, -n]]) {
        const d = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
        d.addColorStop(0, 'rgba(' + g + ',' + g + ',' + g + ',' + a + ')');
        d.addColorStop(1, 'rgba(' + g + ',' + g + ',' + g + ',0)');
        x.fillStyle = d; x.fillRect(px + ox - r, py + oy - r, r * 2, r * 2);
      }
    };
    for (let i = 0; i < 60; i++) tache(40 + alea() * 90, 0.10);
    for (let i = 0; i < 900; i++) tache(3 + alea() * 9, 0.16);
    for (let i = 0; i < 9000; i++) {
      const g = alea() * 255 | 0;
      x.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ',.28)';
      x.fillRect(alea() * n, alea() * n, 1 + alea() * 1.6, 1 + alea() * 1.6);
    }
  }, 1.8);

  // Géométrie tirée du logo officiel (coordonnées du SVG de la charte).
  const E = 2.6 / 218;                 // 218 unités SVG de haut = 2,6 unités 3D
  const cx = 100, cy = 121;
  const P = (x, y) => [(x - cx) * E, (cy - y) * E];

  function prisme(points, avant, arriere, chanfrein) {
    // points : [[x, y]] en SVG. avant(x, y) et arriere : profondeur en unités SVG.
    // chanfrein : largeur du biseau (unités SVG) qui casse l'arête du dessus pour accrocher la lumière.
    const n = points.length;
    let aire = 0;
    for (let i = 0; i < n; i++) { const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % n]; aire += x1 * y2 - x2 * y1; }
    const sens = aire > 0 ? 1 : -1;
    // Pas de biseau le long de l'arête centrale (x = 100) : les deux moitiés de lame se rejoignent bord à bord.
    const surArete = (i) => Math.abs(points[i][0] - 100) < 0.01 && Math.abs(points[(i + 1) % n][0] - 100) < 0.01;
    const recul = (i) => (chanfrein && !surArete(i) ? chanfrein : 0);
    const normale = (i) => {
      const [x1, y1] = points[i], [x2, y2] = points[(i + 1) % n];
      const l = Math.hypot(x2 - x1, y2 - y1) || 1;
      return [-(y2 - y1) / l * sens, (x2 - x1) / l * sens]; // vers l'intérieur
    };
    const dedans = points.map((p, i) => {
      const k = (i + n - 1) % n;
      const [ax, ay] = normale(k), [bx, by] = normale(i);
      const da = recul(k), db = recul(i);
      const det = ax * by - ay * bx;
      if (Math.abs(det) < 1e-6) return [p[0] + ax * da, p[1] + ay * da];
      const ox = (da * by - db * ay) / det, oy = (ax * db - bx * da) / det;
      const l = Math.hypot(ox, oy), max = (chanfrein || 0) * 4;
      return l > max && l > 0 ? [p[0] + ox / l * max, p[1] + oy / l * max] : [p[0] + ox, p[1] + oy];
    });
    const chute = chanfrein ? chanfrein * 0.9 : 0;
    const contour = points.map(([x, y]) => new THREE.Vector2(...P(x, y)));
    const haut = dedans.map(([x, y]) => new THREE.Vector2(...P(x, y)));
    const faces = THREE.ShapeUtils.triangulateShape(haut.map((v) => v.clone()), []);
    const horaire = THREE.ShapeUtils.isClockWise(haut);
    const zA = points.map(([x, y]) => avant(x, y) * E);
    const zC = points.map(([x, y]) => (avant(x, y) - chute) * E);
    const zB = arriere * E;
    const pos = [], uv = [];
    const U = 0.55;
    const pt = (v, z, a, b) => { pos.push(v.x, v.y, z); uv.push(a, b); };
    const dessus = (i, z) => pt(haut[i], z, haut[i].x * U, haut[i].y * U);
    const dessous = (i) => pt(contour[i], zB, contour[i].x * U, contour[i].y * U);
    for (const [a, b, c] of faces) {
      if (horaire) { dessus(a, zA[a]); dessus(c, zA[c]); dessus(b, zA[b]); dessous(a); dessous(b); dessous(c); }
      else { dessus(a, zA[a]); dessus(b, zA[b]); dessus(c, zA[c]); dessous(a); dessous(c); dessous(b); }
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [u, v] = horaire ? [j, i] : [i, j];
      const bord = (k, z) => pt(contour[k], z, (contour[k].x + contour[k].y) * U, z * U);
      if (chanfrein) {                                   // biseau
        dessus(u, zA[u]); bord(u, zC[u]); bord(v, zC[v]);
        dessus(u, zA[u]); bord(v, zC[v]); dessus(v, zA[v]);
      }
      bord(u, zC[u]); bord(u, zB); bord(v, zB);           // chant
      bord(u, zC[u]); bord(v, zB); bord(v, zC[v]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  const metal = (couleur, extra) => new THREE.MeshStandardMaterial(Object.assign({
    color: couleur, metalness: 0.78, roughness: 0.62, roughnessMap: brosse,
    bumpMap: brosse, bumpScale: 0.55, envMapIntensity: 1.25, flatShading: true }, extra));
  const roche = (couleur) => new THREE.MeshStandardMaterial({
    color: couleur, metalness: 0.18, roughness: 1, roughnessMap: pierre,
    bumpMap: pierre, bumpScale: 2.2, envMapIntensity: 0.35, flatShading: true });
  const laque = new THREE.MeshPhysicalMaterial({
    color: 0xc22a22, emissive: 0xc22a22, emissiveIntensity: 0.75, metalness: 0.1, roughness: 0.3,
    clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: 1.2, flatShading: true });

  const arete = (x) => (Math.abs(x - 100) < 0.01 ? 15 : 0); // l'arête centrale de la lame est en relief
  const plat = (z) => () => z;

  const pieces = [
    { nom: 'lameG', g: prisme([[18, 30], [20, 62], [82, 48], [100, 230], [100, 12]], arete, -9, 1.6), m: metal(0xedeae4, { metalness: 0.5, roughness: 0.55, envMapIntensity: 1.5 }), ecart: [-0.16, 0.05, 0.35] },
    { nom: 'lameD', g: prisme([[118, 48], [180, 62], [182, 30], [100, 12], [100, 230]], arete, -9, 1.6), m: metal(0x9a968f, { metalness: 0.9, roughness: 0.5 }), ecart: [0.16, 0.05, 0.35] },
    { nom: 'aileG', g: prisme([[20, 76], [70, 65], [84.6, 209], [24, 126]], plat(-2), -11, 1.8), m: roche(0x6e6b66), ecart: [-0.62, -0.1, -0.5] },
    { nom: 'aileD', g: prisme([[180, 76], [130, 65], [115.4, 209], [176, 126]], plat(-2), -11, 1.8), m: roche(0x6e6b66), ecart: [0.62, -0.1, -0.5] },
    { nom: 'fil', g: prisme([[100, 48], [104.6, 66], [101.6, 212], [100, 227], [98.4, 212], [95.4, 66]], plat(19.5), 9, 0), m: laque, ecart: [0, 0, 1.05] }
  ];

  const bouclier = new THREE.Group();
  for (const p of pieces) {
    p.maille = new THREE.Mesh(p.g, p.m);
    bouclier.add(p.maille);
  }
  scene.add(bouclier);

  // État animé
  const cible = { x: 0, y: 0 };      // pointeur, de -1 à 1
  const lisse = { x: 0, y: 0, eclat: 1.6 };
  let eclatCible = 0;                // 0 = assemblé, 1 = vue éclatée
  let visible = true, actif = false, t0 = performance.now(), dernier = t0;

  function taille() {
    const l = boite.clientWidth, h = boite.clientHeight;
    if (!l || !h) return;
    rendu.setSize(l, h, false);
    camera.aspect = l / h;
    // Recule la caméra en format étroit pour garder le bouclier entier (éclaté compris).
    camera.position.z = 5.9 / Math.min(1, camera.aspect * 1.2);
    camera.updateProjectionMatrix();
    dessiner();
  }

  function defilement() {
    const h = boite.closest('section').offsetHeight || window.innerHeight;
    eclatCible = THREE.MathUtils.clamp((window.scrollY || 0) / (h * 0.75), 0, 1);
    reveiller();
  }

  function dessiner() { rendu.render(scene, camera); }

  function image(maintenant) {
    actif = false;
    if (!visible) return;
    const dt = Math.min(0.05, (maintenant - dernier) / 1000);
    dernier = maintenant;
    const t = (maintenant - t0) / 1000;
    const k = 1 - Math.exp(-dt * 5);

    lisse.x += (cible.x - lisse.x) * k;
    lisse.y += (cible.y - lisse.y) * k;
    lisse.eclat += (eclatCible - lisse.eclat) * (1 - Math.exp(-dt * 3.2));

    const e = lisse.eclat;
    for (const p of pieces) p.maille.position.set(p.ecart[0] * e, p.ecart[1] * e, p.ecart[2] * e);

    const flotte = calme ? 0 : 1;
    bouclier.rotation.y = lisse.x * 0.5 + e * 0.55 + Math.sin(t * 0.45) * 0.1 * flotte;
    bouclier.rotation.x = -lisse.y * 0.3 + Math.sin(t * 0.33) * 0.035 * flotte;
    bouclier.position.y = Math.sin(t * 0.6) * 0.04 * flotte;

    // La lumière principale suit le pointeur : les reflets glissent sur les facettes.
    cle.position.set(-3.5 + lisse.x * 5, 4 - lisse.y * 3, 6);

    // Un seul éclat de lumière qui parcourt la lame à l'arrivée.
    const passe = THREE.MathUtils.clamp((t - 0.5) / 1.6, 0, 1);
    balayage.intensity = Math.sin(passe * Math.PI) * 9;
    balayage.position.set(-0.3, 1.7 - passe * 3.4, 1.5);

    dessiner();

    const bouge = !calme || Math.abs(eclatCible - e) > 0.001 ||
      Math.abs(cible.x - lisse.x) > 0.001 || Math.abs(cible.y - lisse.y) > 0.001 || passe < 1;
    if (bouge) reveiller();
  }

  function reveiller() {
    if (actif || !visible) return;
    actif = true;
    dernier = performance.now();
    requestAnimationFrame(image);
  }

  // Événements
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (ev) => {
      cible.x = (ev.clientX / window.innerWidth) * 2 - 1;
      cible.y = (ev.clientY / window.innerHeight) * 2 - 1;
      reveiller();
    }, { passive: true });
  }
  window.addEventListener('scroll', defilement, { passive: true });
  new ResizeObserver(taille).observe(boite);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting && !document.hidden; reveiller(); }).observe(boite);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden && boite.getBoundingClientRect().bottom > 0;
    reveiller();
  });
  toile.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); visible = false; boite.classList.remove('est-3d'); });
  toile.addEventListener('webglcontextrestored', () => { visible = true; boite.classList.add('est-3d'); reveiller(); });

  taille();
  defilement();
  dessiner();
  boite.classList.add('est-3d');
  reveiller();
}

if (boite && toile) {
  try { demarrer(); } catch (e) { boite.classList.remove('est-3d'); }
}
