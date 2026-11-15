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

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 6.3);

  // Lumières : une clé venant du haut gauche, un contre-jour froid, une ambiance basse.
  scene.add(new THREE.HemisphereLight(0xedeae4, 0x0b0b0c, 0.8));
  const appoint = new THREE.DirectionalLight(0xedeae4, 1.0);
  appoint.position.set(4, 1.5, 5);
  scene.add(appoint);
  const cle = new THREE.DirectionalLight(0xffffff, 2.4);
  cle.position.set(-3.5, 4, 6);
  scene.add(cle);
  const contre = new THREE.DirectionalLight(0xa9a59e, 1.1);
  contre.position.set(5, -1, -3);
  scene.add(contre);
  const balayage = new THREE.PointLight(0xffffff, 0, 12, 1.6);
  scene.add(balayage);

  // Géométrie tirée du logo officiel (coordonnées du SVG de la charte).
  const E = 2.6 / 218;                 // 218 unités SVG de haut = 2,6 unités 3D
  const cx = 100, cy = 121;
  const P = (x, y) => [(x - cx) * E, (cy - y) * E];

  function prisme(points, avant, arriere) {
    // points : [[x, y]] en SVG. avant(x, y) et arriere : profondeur en unités SVG.
    const contour = points.map(([x, y]) => new THREE.Vector2(...P(x, y)));
    const horaire = THREE.ShapeUtils.isClockWise(contour);
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    const zA = points.map(([x, y]) => avant(x, y) * E);
    const zB = arriere * E;
    const pos = [];
    const pousse = (i, z) => pos.push(contour[i].x, contour[i].y, z);
    for (const [a, b, c] of faces) {
      if (horaire) { pousse(a, zA[a]); pousse(c, zA[c]); pousse(b, zA[b]); pousse(a, zB); pousse(b, zB); pousse(c, zB); }
      else { pousse(a, zA[a]); pousse(b, zA[b]); pousse(c, zA[c]); pousse(a, zB); pousse(c, zB); pousse(b, zB); }
    }
    const n = contour.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const [u, v] = horaire ? [j, i] : [i, j];
      pousse(u, zA[u]); pousse(u, zB); pousse(v, zB);
      pousse(u, zA[u]); pousse(v, zB); pousse(v, zA[v]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }

  const matiere = (couleur, extra) => new THREE.MeshStandardMaterial(Object.assign(
    { color: couleur, roughness: 0.52, metalness: 0.28, flatShading: true }, extra));

  const arete = (x) => (Math.abs(x - 100) < 0.01 ? 15 : 0); // l'arête centrale de la lame est en relief
  const plat = (z) => () => z;

  const pieces = [
    { nom: 'lameG', g: prisme([[18, 30], [20, 62], [82, 48], [100, 230], [100, 12]], arete, -9), m: matiere(0xedeae4), ecart: [-0.16, 0.05, 0.35] },
    { nom: 'lameD', g: prisme([[118, 48], [180, 62], [182, 30], [100, 12], [100, 230]], arete, -9), m: matiere(0xa9a59e), ecart: [0.16, 0.05, 0.35] },
    { nom: 'aileG', g: prisme([[20, 76], [70, 65], [84.6, 209], [24, 126]], plat(-2), -11), m: matiere(0x6e6b66), ecart: [-0.62, -0.1, -0.5] },
    { nom: 'aileD', g: prisme([[180, 76], [130, 65], [115.4, 209], [176, 126]], plat(-2), -11), m: matiere(0x6e6b66), ecart: [0.62, -0.1, -0.5] },
    { nom: 'fil', g: prisme([[100, 48], [104.6, 66], [101.6, 212], [100, 227], [98.4, 212], [95.4, 66]], plat(19.5), 9), m: matiere(0xc22a22, { emissive: 0xc22a22, emissiveIntensity: 0.8, roughness: 0.35 }), ecart: [0, 0, 1.05] }
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
