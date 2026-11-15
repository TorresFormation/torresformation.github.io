/* Torres Formation — bouclier en 3D : l'épée (le T) se plante dans le bouclier, puis le fil rouge le scelle.
   three.js est fourni localement.
   Si WebGL manque ou plante, le logo SVG reste affiché : aucune page cassée. */
import * as THREE from '../vendor/three.module.min.js';

const boite = document.getElementById('visuel');
const toile = document.getElementById('scene');
const calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Rendu logiciel (pas de carte graphique utilisée par le navigateur) : on allège fortement.
function logiciel() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const nom = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|software|basic render/i.test(nom);
  } catch (e) { return false; }
}

function demarrer() {
  const lent = logiciel();
  let rendu;
  try {
    rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: !lent, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }

  const petit = window.matchMedia('(max-width: 860px)');
  // Définition d'image : démarre raisonnable, baisse toute seule si l'appareil peine.
  const paliers = [1.75, 1.35, 1, 0.75, 0.55];
  let palier = lent ? 3 : (petit.matches ? 1 : 0);
  const definition = () => Math.min(window.devicePixelRatio || 1, paliers[palier]);
  rendu.setPixelRatio(definition());
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
  const eclair = new THREE.PointLight(0xfff1dc, 0, 14, 1.4);   // flash de l'impact
  scene.add(eclair);
  const braise = new THREE.PointLight(0xff5a1a, 0, 6, 1.6);    // lueur de la soudure
  scene.add(braise);

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

  // Le bouclier (deux ailes) et l'épée (le T), montés séparément : l'épée vient se planter dedans.
  const ensemble = new THREE.Group();
  const epee = new THREE.Group();
  scene.add(ensemble);
  ensemble.add(epee);

  const aileG = new THREE.Mesh(prisme([[20, 76], [70, 65], [84.6, 209], [24, 126]], plat(-2), -11), matiere(0x6e6b66));
  const aileD = new THREE.Mesh(prisme([[180, 76], [130, 65], [115.4, 209], [176, 126]], plat(-2), -11), matiere(0x6e6b66));
  ensemble.add(aileG, aileD);
  epee.add(new THREE.Mesh(prisme([[18, 30], [20, 62], [82, 48], [100, 230], [100, 12]], arete, -9), matiere(0xedeae4)));
  epee.add(new THREE.Mesh(prisme([[118, 48], [180, 62], [182, 30], [100, 12], [100, 230]], arete, -9), matiere(0xa9a59e)));

  // Le fil rouge : un cordon de soudure posé sur l'arête, bien visible de face.
  // Il se trace de haut en bas après l'impact, en fusion, puis refroidit jusqu'au rouge de la charte.
  const FIL_HAUT = 50, FIL_BAS = 224;
  const gFil = prisme([[100, FIL_HAUT], [103, 62], [101.7, 206], [100, FIL_BAS], [98.3, 206], [97, 62]], plat(18), 8);
  const yHaut = P(100, FIL_HAUT)[1], yBas = P(100, FIL_BAS)[1];
  gFil.translate(0, -yHaut, 0);
  const mFil = new THREE.MeshStandardMaterial({ color: 0xc22a22, emissive: 0xc22a22, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.1, flatShading: true, side: THREE.DoubleSide });
  const fil = new THREE.Mesh(gFil, mFil);
  fil.position.y = yHaut;
  fil.visible = false;
  epee.add(fil);

  // Point chaud en tête de soudure (petit halo dessiné sur place).
  const halo = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), d = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    d.addColorStop(0, 'rgba(255,244,214,1)'); d.addColorStop(0.25, 'rgba(255,150,50,.75)'); d.addColorStop(1, 'rgba(255,70,10,0)');
    x.fillStyle = d; x.fillRect(0, 0, 64, 64);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
    sp.visible = false; epee.add(sp); return sp;
  })();

  // Étincelles de l'impact.
  const NB = lent ? 36 : 90;
  const etPos = new Float32Array(NB * 3), etVit = new Float32Array(NB * 3), etVie = new Float32Array(NB);
  const foyers = [P(50, 66), P(150, 66), P(100, 70), P(76, 60), P(124, 60)];
  let graine = 11;
  const alea = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  for (let i = 0; i < NB; i++) {
    const f = foyers[i % foyers.length], ang = alea() * Math.PI * 2, v = 0.8 + alea() * 2.6;
    etPos[i * 3] = f[0]; etPos[i * 3 + 1] = f[1]; etPos[i * 3 + 2] = 0.12;
    etVit[i * 3] = Math.cos(ang) * v; etVit[i * 3 + 1] = Math.abs(Math.sin(ang)) * v * 0.9 + 0.4; etVit[i * 3 + 2] = 0.4 + alea() * 1.8;
    etVie[i] = 0.35 + alea() * 0.55;
  }
  const etDepart = etPos.slice();
  const gEt = new THREE.BufferGeometry();
  gEt.setAttribute('position', new THREE.BufferAttribute(etPos, 3));
  const mEt = new THREE.PointsMaterial({ color: 0xffb060, size: 0.045, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const etincelles = new THREE.Points(gEt, mEt);
  etincelles.visible = false; etincelles.frustumCulled = false;
  ensemble.add(etincelles);

  // Chronologie de l'ouverture (secondes)
  const T_CHUTE = 0.55, T_IMPACT = 1.3, T_SOUDE = 1.6, T_SOUDE_FIN = 2.75, REFROIDI = 2.6;
  const chaud = new THREE.Color(1, 0.86, 0.5), orange = new THREE.Color(1, 0.3, 0.05), rouge = new THREE.Color(0xc22a22);
  const teinte = new THREE.Color();

  // État animé
  const cible = { x: 0, y: 0 };      // pointeur, de -1 à 1
  const lisse = { x: 0, y: 0, tour: 0 };
  let tourCible = 0;
  let visible = true, actif = false, t0 = 0, dernier = 0;
  let mesure = 0, images = 0;

  function taille() {
    const l = boite.clientWidth, h = boite.clientHeight;
    if (!l || !h) return;
    rendu.setPixelRatio(definition());
    rendu.setSize(l, h, false);
    camera.aspect = l / h;
    // Recule la caméra en format étroit pour garder le bouclier entier.
    camera.position.z = 5.9 / Math.min(1, camera.aspect * 1.2);
    camera.updateProjectionMatrix();
    dessiner();
  }

  function defilement() {
    const h = boite.closest('section').offsetHeight || window.innerHeight;
    tourCible = THREE.MathUtils.clamp((window.scrollY || 0) / (h * 0.75), 0, 1);
    reveiller();
  }

  function dessiner() { rendu.render(scene, camera); }

  function poser(t) {
    // --- 1. L'épée tombe et se plante ---
    const a = THREE.MathUtils.clamp((t - T_CHUTE) / (T_IMPACT - T_CHUTE), 0, 1);
    const chute = 1 - a * a * a;                       // accélère jusqu'à l'impact
    const s = t - T_IMPACT;                            // temps depuis l'impact
    const choc = s > 0 ? Math.exp(-s * 7) : 0;
    epee.visible = t >= T_CHUTE;
    epee.position.set(0, chute * 5.4 - (s > 0 ? 0.07 * Math.exp(-s * 9) * Math.cos(s * 34) : 0), chute * 1.6);
    epee.rotation.set(-chute * 0.75, chute * chute * 2.2, 0);

    // --- 2. Le bouclier encaisse ---
    const recul = s > 0 ? choc * Math.cos(s * 30) : 0;
    const ouvre = s > 0 ? 0.075 * Math.exp(-s * 6) * Math.abs(Math.cos(s * 22)) : 0;
    aileG.position.set(-ouvre, -0.05 * recul, -0.1 * choc);
    aileD.position.set(ouvre, -0.05 * recul, -0.1 * choc);
    ensemble.position.y = -0.1 * recul;
    eclair.intensity = s > 0 ? 26 * Math.exp(-s * 7) : 0;
    eclair.position.set(0, 0.7, 1.6);

    // --- 3. Étincelles ---
    if (s > 0 && s < 1) {
      etincelles.visible = true;
      for (let i = 0; i < NB; i++) {
        const k = Math.min(s, etVie[i]), j = i * 3;
        etPos[j] = etDepart[j] + etVit[j] * k;
        etPos[j + 1] = etDepart[j + 1] + etVit[j + 1] * k - 3.2 * k * k;
        etPos[j + 2] = etDepart[j + 2] + etVit[j + 2] * k;
      }
      gEt.attributes.position.needsUpdate = true;
      mEt.opacity = Math.max(0, 1 - s / 0.85);
    } else etincelles.visible = false;

    // --- 4. Le fil rouge scelle l'ensemble : en fusion, puis il refroidit ---
    const p = THREE.MathUtils.clamp((t - T_SOUDE) / (T_SOUDE_FIN - T_SOUDE), 0, 1);
    const trace = p * p * (3 - 2 * p);
    fil.visible = trace > 0;
    fil.scale.y = Math.max(0.0001, trace);
    const froid = THREE.MathUtils.clamp((t - T_SOUDE_FIN) / REFROIDI, 0, 1);
    if (froid < 0.35) teinte.copy(chaud).lerp(orange, froid / 0.35);
    else teinte.copy(orange).lerp(rouge, (froid - 0.35) / 0.65);
    mFil.emissive.copy(teinte);
    mFil.color.copy(teinte);
    mFil.emissiveIntensity = 2.4 - 1.8 * froid;        // reste lumineux à la fin : toujours visible de face
    const yTete = yHaut + (yBas - yHaut) * trace;
    halo.visible = trace > 0 && trace < 1;
    halo.position.set(0, yTete, 0.26);
    halo.scale.setScalar(0.5);
    braise.intensity = trace > 0 ? 7 * (1 - froid) : 0;
    braise.position.set(0, trace < 1 ? yTete : 0, 0.7);
    return t < T_SOUDE_FIN + REFROIDI + 0.2;           // encore en cours ?
  }

  function image(maintenant) {
    actif = false;
    if (!visible) return;
    if (!t0) { t0 = maintenant; dernier = maintenant; }
    const brut = (maintenant - dernier) / 1000;
    const dt = Math.min(0.05, brut);
    dernier = maintenant;
    const t = calme ? 99 : (maintenant - t0) / 1000;
    const k = 1 - Math.exp(-dt * 5);

    lisse.x += (cible.x - lisse.x) * k;
    lisse.y += (cible.y - lisse.y) * k;
    lisse.tour += (tourCible - lisse.tour) * (1 - Math.exp(-dt * 3.2));

    const enCours = poser(t);

    const flotte = calme ? 0 : 1;
    ensemble.rotation.y = lisse.x * 0.5 + lisse.tour * 0.7 + Math.sin(t * 0.45) * 0.1 * flotte;
    ensemble.rotation.x = -lisse.y * 0.3 + Math.sin(t * 0.33) * 0.035 * flotte;
    ensemble.position.y += Math.sin(t * 0.6) * 0.04 * flotte;

    dessiner();

    // Garde-fou de fluidité : si les images mettent trop de temps, on baisse la définition.
    if (brut > 0 && brut < 0.5) { mesure += brut; images++; }
    if (images >= 45) {
      const moyenne = mesure / images;
      mesure = 0; images = 0;
      if (moyenne > 0.026 && palier < paliers.length - 1) { palier++; taille(); }
    }

    const bouge = !calme || enCours || Math.abs(tourCible - lisse.tour) > 0.001 ||
      Math.abs(cible.x - lisse.x) > 0.001 || Math.abs(cible.y - lisse.y) > 0.001;
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
  poser(calme ? 99 : 0);
  dessiner();
  boite.classList.add('est-3d');
  reveiller();
}

if (boite && toile) {
  try { demarrer(); } catch (e) { boite.classList.remove('est-3d'); }
}
