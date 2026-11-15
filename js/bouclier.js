/* Torres Formation — le bouclier s'assemble à l'ouverture :
   les trois pièces arrivent dans leurs teintes de la charte (aucune incandescence), l'épée (le T)
   se plante, puis le fil rouge se grave en soudant brièvement le métal.
   Au doigt ou à la souris, on peut le faire pivoter. Le logo suit le thème clair / sombre du site.
   three.js est fourni localement. Si WebGL manque, le logo statique s'affiche. */
import * as THREE from '../vendor/three.module.min.js';

const boite = document.getElementById('visuel');
const toile = document.getElementById('scene');
const calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const apercu = /[?&]hq\b/.test(location.search);            // test : force la pleine définition
const fige = (location.search.match(/[?&]t=([\d.]+)/) || [])[1]; // test : fige l'animation à t secondes

// Rendu logiciel (le navigateur n'utilise pas la carte graphique) : on allège fortement.
function logiciel() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    const nom = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    return /swiftshader|llvmpipe|software|basic render/i.test(nom);
  } catch (e) { return false; }
}

function demarrer() {
  const lent = !apercu && logiciel();
  let rendu;
  try {
    rendu = new THREE.WebGLRenderer({ canvas: toile, antialias: !lent, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { boite.classList.add('sans-3d'); return; }

  const petit = window.matchMedia('(max-width: 860px)');
  // Définition d'image : démarre raisonnable, baisse toute seule si l'appareil peine.
  const paliers = [1.75, 1.35, 1, 0.75, 0.55];
  let palier = lent ? 3 : (petit.matches ? 1 : 0);
  const definition = () => Math.min(window.devicePixelRatio || 1, paliers[palier]);
  rendu.setPixelRatio(definition());
  rendu.outputColorSpace = THREE.SRGBColorSpace;
  rendu.toneMapping = THREE.NeutralToneMapping;     // garde les couleurs de la charte fidèles
  rendu.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 6.3);

  // Lumières
  scene.add(new THREE.HemisphereLight(0xedeae4, 0x0b0b0c, 0.4));
  const cle = new THREE.DirectionalLight(0xffffff, 2.3);
  cle.position.set(-3.5, 4, 6);
  scene.add(cle);
  const contre = new THREE.DirectionalLight(0xa9b0bc, 1.3);
  contre.position.set(5, -1, -3);
  scene.add(contre);
  const eclair = new THREE.PointLight(0xffffff, 0, 14, 1.4);   // flash de l'impact
  scene.add(eclair);
  const braise = new THREE.PointLight(0xff6a2a, 0, 1.1, 2);    // lueur de la soudure
  scene.add(braise);

  // Studio de reflets fabriqué sur place (aucune image à charger) : le métal y accroche des panneaux lumineux.
  (function studio() {
    const piece = new THREE.Scene();
    piece.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x0d0d0f, side: THREE.BackSide })));
    const panneau = (l, h, x, y, z, force, teinte) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(l, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(teinte).multiplyScalar(force), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); piece.add(m);
    };
    panneau(7, 3, -5, 6, 5, 8, 0xfff3e2);
    panneau(1.2, 9, 7, 1, 3, 5, 0xffffff);
    panneau(9, 0.8, 0, -6, 6, 2.2, 0xedeae4);
    panneau(4, 4, 2, 3, -8, 2.6, 0xa9b0bc);
    const pm = new THREE.PMREMGenerator(rendu);
    scene.environment = pm.fromScene(piece, 0.03).texture;
    pm.dispose();
    piece.traverse((o) => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } });
  })();

  // Géométrie tirée du logo officiel (coordonnées du SVG de la charte).
  const E = 2.6 / 218;                 // 218 unités SVG de haut = 2,6 unités 3D
  const cx = 100, cy = 121;
  const P = (x, y) => [(x - cx) * E, (cy - y) * E];

  function prisme(points, avant, arriere, chanfrein) {
    // points : [[x, y]] en SVG. avant(x, y) et arriere : profondeur en unités SVG.
    // chanfrein : largeur du biseau (unités SVG) qui casse l'arête et accroche la lumière.
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
      return [-(y2 - y1) / l * sens, (x2 - x1) / l * sens];
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
    const U = 0.75;
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
      if (chanfrein) {
        dessus(u, zA[u]); bord(u, zC[u]); bord(v, zC[v]);
        dessus(u, zA[u]); bord(v, zC[v]); dessus(v, zA[v]);
      }
      bord(u, zC[u]); bord(u, zB); bord(v, zB);
      bord(u, zC[u]); bord(v, zB); bord(v, zC[v]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  // Matière : les trois teintes du logo officiel (os, acier, pierre), finition satinée lisse, sans texture.
  // Facettes nettes comme le dessin du logo ; les reflets restent doux pour ne pas dénaturer les couleurs.
  const matiere = (couleur, extra) => new THREE.MeshStandardMaterial(Object.assign({
    color: couleur, metalness: 0.2, roughness: 0.5, envMapIntensity: 0.55, flatShading: true }, extra));
  const arete = (x) => (Math.abs(x - 100) < 0.01 ? 15 : 0); // l'arête centrale de la lame est en relief
  const plat = (z) => () => z;

  const mLG = matiere(0xedeae4, { roughness: 0.55 });              // lame gauche
  const mLD = matiere(0xa9a59e, { roughness: 0.45 });              // lame droite
  const mAile = matiere(0x6e6b66, { roughness: 0.6 });             // ailes
  // Thème : sur fond sombre, les teintes du logo officiel ; sur fond clair, leur version foncée.
  const TEINTES = { sombre: [0xedeae4, 0xa9a59e, 0x6e6b66], clair: [0x1b1b1e, 0x6e6b66, 0xa9a59e] };
  function teinter() {
    const t = TEINTES[document.documentElement.dataset.theme === 'clair' ? 'clair' : 'sombre'];
    mLG.color.setHex(t[0]); mLD.color.setHex(t[1]); mAile.color.setHex(t[2]);
  }
  teinter();

  // Le bouclier (deux ailes) et l'épée (le T), montés séparément : tout converge vers le centre.
  const ensemble = new THREE.Group();
  const epee = new THREE.Group();
  scene.add(ensemble);
  ensemble.add(epee);
  const aileG = new THREE.Mesh(prisme([[20, 76], [70, 65], [84.6, 209], [24, 126]], plat(-2), -11, 1.8), mAile);
  const aileD = new THREE.Mesh(prisme([[180, 76], [130, 65], [115.4, 209], [176, 126]], plat(-2), -11, 1.8), mAile);
  ensemble.add(aileG, aileD);
  epee.add(new THREE.Mesh(prisme([[18, 30], [20, 62], [82, 48], [100, 230], [100, 12]], arete, -9, 1.6), mLG));
  epee.add(new THREE.Mesh(prisme([[118, 48], [180, 62], [182, 30], [100, 12], [100, 230]], arete, -9, 1.6), mLD));

  // Le fil rouge : un cordon de soudure posé sur l'arête, visible aussi de face.
  const FIL_HAUT = 50, FIL_BAS = 224;
  const gFil = prisme([[100, FIL_HAUT], [103, 62], [101.7, 206], [100, FIL_BAS], [98.3, 206], [97, 62]], plat(18), 8);
  const yHaut = P(100, FIL_HAUT)[1], yBas = P(100, FIL_BAS)[1];
  gFil.translate(0, -yHaut, 0);
  const mFil = new THREE.MeshStandardMaterial({ color: 0xc22a22, emissive: 0xc22a22, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0, flatShading: true, side: THREE.DoubleSide });
  const fil = new THREE.Mesh(gFil, mFil);
  fil.position.y = yHaut;
  fil.visible = false;
  epee.add(fil);

  // Point chaud en tête de soudure.
  const halo = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), d = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    d.addColorStop(0, 'rgba(255,244,214,1)'); d.addColorStop(0.25, 'rgba(255,150,50,.75)'); d.addColorStop(1, 'rgba(255,70,10,0)');
    x.fillStyle = d; x.fillRect(0, 0, 64, 64);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthTest: false, transparent: true }));
    sp.visible = false; epee.add(sp); return sp;
  })();

  // Onde de choc : un anneau lumineux qui s'élargit.
  const onde = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64),
    new THREE.MeshBasicMaterial({ color: 0xa9a59e, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
  onde.visible = false;
  ensemble.add(onde);

  // Étincelles : une volée à l'impact.
  const NB = lent ? 24 : 60;
  const etPos = new Float32Array(NB * 3), etVit = new Float32Array(NB * 3), etVie = new Float32Array(NB), etDepart = new Float32Array(NB * 3);
  const foyers = [P(50, 66), P(150, 66), P(100, 70), P(76, 60), P(124, 60), P(100, 120)];
  let graine = 11;
  const alea = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; };
  for (let i = 0; i < NB; i++) {
    const f = foyers[i % foyers.length], ang = alea() * Math.PI * 2, v = 0.8 + alea() * 2.8;
    etDepart[i * 3] = f[0]; etDepart[i * 3 + 1] = f[1]; etDepart[i * 3 + 2] = 0.12;
    etVit[i * 3] = Math.cos(ang) * v; etVit[i * 3 + 1] = Math.abs(Math.sin(ang)) * v * 0.9 + 0.4; etVit[i * 3 + 2] = 0.4 + alea() * 1.8;
    etVie[i] = 0.4 + alea() * 0.6;
  }
  etPos.set(etDepart);
  const gEt = new THREE.BufferGeometry();
  gEt.setAttribute('position', new THREE.BufferAttribute(etPos, 3));
  const mEt = new THREE.PointsMaterial({ color: 0xa9a59e, size: 0.035, transparent: true, opacity: 0, depthWrite: false });
  const etincelles = new THREE.Points(gEt, mEt);
  etincelles.visible = false; etincelles.frustumCulled = false;
  ensemble.add(etincelles);

  // Gerbe de soudure : quelques étincelles chaudes qui partent de la tête du trait, brièvement.
  const NS = lent ? 14 : 36;
  const soPos = new Float32Array(NS * 3), soVit = new Float32Array(NS * 3), soNe = new Float32Array(NS);
  for (let i = 0; i < NS; i++) {
    const ang = alea() * Math.PI * 2, v = 0.35 + alea() * 1.1;
    soVit[i * 3] = Math.cos(ang) * v; soVit[i * 3 + 1] = Math.sin(ang) * v * 0.7 + 0.25; soVit[i * 3 + 2] = 0.5 + alea() * 1.2;
    soNe[i] = i / NS;                                  // moment de naissance le long du tracé (0 à 1)
  }
  const gSo = new THREE.BufferGeometry();
  gSo.setAttribute('position', new THREE.BufferAttribute(soPos, 3));
  const mSo = new THREE.PointsMaterial({ color: 0xffc27a, size: 0.03, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const soudure = new THREE.Points(gSo, mSo);
  soudure.visible = false; soudure.frustumCulled = false;
  epee.add(soudure);

  // Chronologie (secondes)
  const T_AILES = 0.15, T_AILES_FIN = 1.55, T_CHUTE = 0.8, T_IMPACT = 1.95;
  const T_SOUDE = 2.2, T_SOUDE_FIN = 3.0, REFROIDI = 0.7;
  const FIN = T_SOUDE_FIN + REFROIDI + 0.2;
  const sortie = (x) => 1 - Math.pow(1 - x, 3);
  const borne = THREE.MathUtils.clamp;
  const lisser = (x) => x * x * (3 - 2 * x);

  const chaud = new THREE.Color(1, 0.78, 0.45), orange = new THREE.Color(1, 0.3, 0.06), rouge = new THREE.Color(0xc22a22);
  const teinte = new THREE.Color();

  function poser(t) {
    const s = t - T_IMPACT;                           // temps depuis l'impact
    const choc = s > 0 ? Math.exp(-s * 7) : 0;

    // --- 1. Les ailes arrivent du fond, en tournant, et se posent ---
    const e = sortie(borne((t - T_AILES) / (T_AILES_FIN - T_AILES), 0, 1)), r = 1 - e;
    aileG.visible = aileD.visible = t >= T_AILES;
    const ouvre = s > 0 ? 0.075 * Math.exp(-s * 6) * Math.abs(Math.cos(s * 22)) : 0;   // elles s'écartent sous le choc
    const recul = s > 0 ? choc * Math.cos(s * 30) : 0;
    aileG.position.set(-1.7 * r - ouvre, 0.55 * r - 0.05 * recul, -5.5 * r - 0.1 * choc);
    aileD.position.set(1.7 * r + ouvre, -0.45 * r - 0.05 * recul, -5.5 * r - 0.1 * choc);
    aileG.rotation.set(0.6 * r, 1.7 * r, 0.7 * r);
    aileD.rotation.set(-0.5 * r, -1.7 * r, -0.7 * r);

    // --- 2. L'épée tombe de haut, accélère, se plante ---
    const a = borne((t - T_CHUTE) / (T_IMPACT - T_CHUTE), 0, 1);
    const chute = 1 - a * a * a;
    epee.visible = t >= T_CHUTE;
    epee.position.set(0, chute * 5.2 - (s > 0 ? 0.07 * Math.exp(-s * 9) * Math.cos(s * 34) : 0), -chute * 3.4);
    epee.rotation.set(-chute * 0.6, chute * chute * 2.4, chute * 0.25);
    ensemble.position.y = -0.1 * recul;

    // --- 3. Flash, onde de choc, étincelles ---
    const clac = t > T_AILES_FIN ? 7 * Math.exp(-(t - T_AILES_FIN) * 16) : 0;       // petit « clac » des ailes
    eclair.intensity = (s > 0 ? 14 * Math.exp(-s * 8) : 0) + clac * 0.6;
    eclair.position.set(0, 0.7, 1.6);
    onde.visible = s > 0 && s < 0.75;
    if (onde.visible) {
      onde.position.set(0, 0.5, 0.3);
      onde.scale.setScalar(0.25 + Math.sin(Math.min(1, s / 0.75) * 1.5708) * 0.85);   // reste dans le cadre : aucun bord de toile visible
      onde.material.opacity = 0.45 * Math.pow(1 - s / 0.75, 2.4);
    }
    if (s > 0 && s < 1.05) {
      etincelles.visible = true;
      for (let i = 0; i < NB; i++) {
        const k = Math.min(s, etVie[i]), j = i * 3;
        etPos[j] = etDepart[j] + etVit[j] * k;
        etPos[j + 1] = etDepart[j + 1] + etVit[j + 1] * k - 3.2 * k * k;
        etPos[j + 2] = etDepart[j + 2] + etVit[j + 2] * k;
      }
      gEt.attributes.position.needsUpdate = true;
      mEt.opacity = Math.max(0, 1 - s / 0.95);
    } else etincelles.visible = false;

    // --- 4. Le fil rouge se grave : la tête soude le métal un court instant, le trait prend aussitôt le rouge de la charte ---
    const p = borne((t - T_SOUDE) / (T_SOUDE_FIN - T_SOUDE), 0, 1);
    const trace = lisser(p);
    fil.visible = trace > 0;
    fil.scale.y = Math.max(0.0001, trace);
    const froid = borne((t - T_SOUDE_FIN) / REFROIDI, 0, 1);
    if (froid < 0.35) teinte.copy(chaud).lerp(orange, froid / 0.35);
    else teinte.copy(orange).lerp(rouge, (froid - 0.35) / 0.65);
    mFil.emissive.copy(teinte);
    mFil.color.copy(teinte);
    mFil.emissiveIntensity = 2.2 - 1.9 * froid;
    const yTete = yHaut + (yBas - yHaut) * trace;
    halo.visible = trace > 0 && trace < 1;
    halo.position.set(0, yTete, 0.26);
    halo.scale.setScalar(0.42);
    braise.intensity = trace > 0 && trace < 1 ? 1.6 : 0;      // lueur locale, uniquement autour de la tête de soudure
    braise.position.set(0, yTete, 0.42);
    // Gerbe de soudure : chaque étincelle naît au passage de la tête et vit 0,35 s.
    const ts = t - T_SOUDE, duree = T_SOUDE_FIN - T_SOUDE;
    soudure.visible = ts > 0 && ts < duree + 0.4;
    if (soudure.visible) {
      for (let i = 0; i < NS; i++) {
        const age = ts - soNe[i] * duree, j = i * 3;
        if (age < 0 || age > 0.35) { soPos[j] = 0; soPos[j + 1] = -99; soPos[j + 2] = 0; continue; }
        const y0 = yHaut + (yBas - yHaut) * lisser(soNe[i]);
        soPos[j] = soVit[j] * age; soPos[j + 1] = y0 + soVit[j + 1] * age - 2.6 * age * age; soPos[j + 2] = 0.24 + soVit[j + 2] * age;
      }
      gSo.attributes.position.needsUpdate = true;
      mSo.opacity = 1;
    }
    return t < FIN;                                   // encore en cours ?
  }

  // État animé
  const cible = { x: 0, y: 0 };      // pointeur (souris), de -1 à 1
  const lisse = { x: 0, y: 0, tour: 0 };
  let tourCible = 0;
  let visible = true, actif = false, pret = false, t0 = 0, dernier = 0;
  let mesure = 0, images = 0;
  // Si le logo statique a déjà été montré (démarrage très lent), on ne rejoue pas la forge.
  const dejaVu = calme || boite.classList.contains('sans-3d');

  // Pivot au doigt (ou souris maintenue) : angle libre pendant le geste, retour en souplesse au relâchement.
  const pivot = { x: 0, y: 0, vx: 0, vy: 0 };
  let tire = null;
  const MAX_X = 1.1, MAX_Y = 0.45;
  const auRepos = () => !tire && Math.abs(pivot.x) + Math.abs(pivot.y) + Math.abs(pivot.vx) + Math.abs(pivot.vy) < 0.002;

  function taille() {
    const l = boite.clientWidth, h = boite.clientHeight;
    if (!l || !h) return;
    rendu.setPixelRatio(definition());
    rendu.setSize(l, h, false);
    camera.aspect = l / h;
    camera.position.z = 5.2 / Math.min(1, camera.aspect * 1.2);   // recule en format étroit
    camera.updateProjectionMatrix();
    if (pret) dessiner();      // jamais d'image avant que la scène soit posée au début de l'animation
  }

  function defilement() {
    const h = boite.closest('section').offsetHeight || window.innerHeight;
    tourCible = THREE.MathUtils.clamp((window.scrollY || 0) / (h * 0.75), 0, 1);
    reveiller();
  }

  function dessiner() { rendu.render(scene, camera); }

  function image(maintenant) {
    actif = false;
    if (!visible || !pret) return;
    if (!t0) { t0 = maintenant - (dejaVu ? 99000 : 0); dernier = maintenant; }
    const brut = (maintenant - dernier) / 1000;
    const t = (maintenant - t0) / 1000;
    const enAnim = t < FIN;
    const libre = auRepos();
    const mouvement = !libre || Math.abs(tourCible - lisse.tour) > 0.001 || Math.abs(cible.x - lisse.x) > 0.001 || Math.abs(cible.y - lisse.y) > 0.001;

    // Au repos, 30 images par seconde suffisent ; pendant l'animation ou un geste, pleine cadence.
    if (!enAnim && libre && brut < 0.03) { actif = true; requestAnimationFrame(image); return; }

    const dt = Math.min(0.05, brut);
    dernier = maintenant;
    const k = 1 - Math.exp(-dt * 5);
    lisse.x += (cible.x - lisse.x) * k;
    lisse.y += (cible.y - lisse.y) * k;
    lisse.tour += (tourCible - lisse.tour) * (1 - Math.exp(-dt * 3.2));

    // Ressort amorti : le logo revient de face avec un léger rebond.
    if (!tire) {
      for (const [a, v] of [['x', 'vx'], ['y', 'vy']]) {
        pivot[v] += (-38 * pivot[a] - 7.5 * pivot[v]) * dt;
        pivot[a] += pivot[v] * dt;
      }
      if (auRepos()) pivot.x = pivot.y = pivot.vx = pivot.vy = 0;
    }

    poser(t);
    const flotte = calme ? 0 : 1;
    ensemble.rotation.y = lisse.x * 0.5 + lisse.tour * 0.7 + pivot.x + Math.sin(t * 0.45) * 0.1 * flotte;
    ensemble.rotation.x = -lisse.y * 0.3 + pivot.y + Math.sin(t * 0.33) * 0.035 * flotte;
    ensemble.position.y += Math.sin(t * 0.6) * 0.04 * flotte;
    dessiner();

    // Garde-fou de fluidité : si les images prennent trop de temps, on baisse la définition.
    if (enAnim && t > 0.4 && brut > 0 && brut < 0.5) { mesure += brut; images++; }
    if (images >= 45) {
      const moyenne = mesure / images;
      mesure = 0; images = 0;
      if (moyenne > 0.026 && palier < paliers.length - 1) { palier++; taille(); }
    }

    if (enAnim || !calme || mouvement) relancer();
  }

  function relancer() { actif = true; requestAnimationFrame(image); }
  function reveiller() {
    if (actif || !visible || !pret || fige !== undefined) return;
    dernier = performance.now();
    relancer();
  }

  // Événements
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (ev) => {
      if (ev.pointerType !== 'mouse') return;
      cible.x = (ev.clientX / window.innerWidth) * 2 - 1;
      cible.y = (ev.clientY / window.innerHeight) * 2 - 1;
      reveiller();
    }, { passive: true });
  }

  // Geste : glisser horizontalement fait pivoter le logo ; le défilement vertical de la page reste libre (touch-action: pan-y).
  toile.addEventListener('pointerdown', (ev) => {
    if (ev.button > 0) return;
    tire = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, px: pivot.x, py: pivot.y, l: Math.max(200, toile.clientWidth) };
    pivot.vx = pivot.vy = 0;
    try { toile.setPointerCapture(ev.pointerId); } catch (e) { /* rien */ }
    reveiller();
  });
  toile.addEventListener('pointermove', (ev) => {
    if (!tire || ev.pointerId !== tire.id) return;
    const dx = (ev.clientX - tire.x) / tire.l, dy = (ev.clientY - tire.y) / tire.l;
    // Résistance progressive près des butées : on sent la limite sans blocage sec.
    const amorti = (v, m) => m * Math.tanh(v / m);
    pivot.x = amorti(tire.px + dx * 3.2, MAX_X);
    pivot.y = amorti(tire.py + dy * 1.6, MAX_Y);
    reveiller();
  });
  const lacher = (ev) => {
    if (!tire || ev.pointerId !== tire.id) return;
    tire = null;
    reveiller();
  };
  toile.addEventListener('pointerup', lacher);
  toile.addEventListener('pointercancel', lacher);
  toile.addEventListener('lostpointercapture', lacher);

  window.addEventListener('scroll', defilement, { passive: true });
  new ResizeObserver(taille).observe(boite);
  new IntersectionObserver(([en]) => { visible = en.isIntersecting && !document.hidden; reveiller(); }).observe(boite);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden && boite.getBoundingClientRect().bottom > 0;
    reveiller();
  });
  toile.addEventListener('webglcontextlost', (ev) => {
    ev.preventDefault(); visible = false;
    boite.classList.remove('est-3d'); boite.classList.add('sans-3d');
  });
  toile.addEventListener('webglcontextrestored', () => { visible = true; boite.classList.remove('sans-3d'); boite.classList.add('est-3d'); reveiller(); });

  // Changement de thème (clair / sombre) : on reteinte les pièces et on redessine.
  document.addEventListener('tf:theme', () => { teinter(); if (pret) { if (fige !== undefined || !actif) dessiner(); reveiller(); } });

  taille();
  defilement();

  // Compile tous les matériaux avant la première image : pas d'à-coup au démarrage.
  for (const o of [aileG, aileD, epee, fil, halo, onde, etincelles, soudure]) o.visible = true;
  rendu.compile(scene, camera);
  pret = true;
  if (fige !== undefined) {
    poser(parseFloat(fige)); dessiner();
  } else {
    poser(dejaVu ? 99 : 0);     // première image : scène vide, les pièces ne sont pas encore arrivées
    dessiner();
  }
  boite.classList.remove('sans-3d');
  boite.classList.add('est-3d');       // la toile n'apparaît qu'une fois la première image correcte dessinée
  reveiller();
}

if (boite && toile) {
  try { demarrer(); } catch (e) { boite.classList.remove('est-3d'); boite.classList.add('sans-3d'); }
}
