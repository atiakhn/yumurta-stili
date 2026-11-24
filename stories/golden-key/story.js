// The Golden Key — fiction, plot twist. A man tells the town he buried a golden key worth ten thousand dollars in his
// overgrown backyard, sells digging tickets, and gets the land cleared for free (and paid for it). Pumpkins follow.
// Sets: YARD (x≈0: the yard, his house, the fence and gate, the street, the overgrown field next door)
//       FARM (x≈300: the explainer, a farmer paying a crew)
// Every cue is pinned to a word of voice/words.json (W('word', n) = start of the n-th match).
// Light: ONE sun per set (warm key, real shadows, the characters' included) against a cool sky fill. It changes with
// the story: day -> a time-lapse ("Weeks go by") -> a pink morning -> day -> golden autumn -> spring. Every change of
// season or of the yard's state happens inside a whip (motion blur hides the swap).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stoneTex, woodTex, painted, flat, rng, D, shade } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, glow } from '/engine/src/fx.js';

export const NAME = 'golden-key';
export const FPS = 30;
export let DUR = 56.2;   // recomputed in setup() from the last word
export const CUES = [];
export const SCORE = 'folk';      // audio/mix.py: a light G-major tune instead of the Hicaz score

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const lin = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerpN = (a, b, k) => a + (b - a) * k;
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const backOut = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;
const hash = (i, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
let C, W;
const cast = {}, dyn = {}, extras = [];

function wordTimes(words) {
  const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return (w, n = 1) => { let k = 0; for (const x of words) if (norm(x.word) === norm(w) && ++k === n) return x.start; throw new Error('word not found: ' + w + ' #' + n); };
}
function shadows(g) {
  g.traverse(o => {
    if (!o.isMesh) return;
    if (o.material.isMeshLambertMaterial) o.receiveShadow = true;
    if (/Box|Cylinder|Extrude|Lathe|Torus|Dodecahedron|Sphere/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true;
  });
}
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function ctex(c, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t; }
const FONT = '"Inter", "Segoe UI Black", "Arial Black", sans-serif';

// ---------------------------------------------------------------- textures (painted flats, thin dark-tint lines)
function grassTex({ base = '#86bf4e', seed = 3, rep = [1, 1], dirt = 0 } = {}) {
  const [c, g] = cv(512, 512), R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = shade(base, .9 + R() * .2); g.globalAlpha = .5; g.beginPath(); g.ellipse(R() * 512, R() * 512, 20 + R() * 40, 10 + R() * 20, R() * 3, 0, 6.29); g.fill(); }
  for (let i = 0; i < dirt * 40; i++) { g.fillStyle = shade('#a8805a', .9 + R() * .2); g.globalAlpha = .55; g.beginPath(); g.ellipse(R() * 512, R() * 512, 16 + R() * 30, 8 + R() * 14, R() * 3, 0, 6.29); g.fill(); }
  g.globalAlpha = .55; g.lineWidth = 2; g.lineCap = 'round';
  for (let i = 0; i < 900; i++) { const x = R() * 512, y = R() * 512, l = 6 + R() * 9; g.strokeStyle = shade(base, R() < .5 ? .7 : 1.18); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 5, y - l); g.stroke(); }
  g.globalAlpha = 1; return ctex(c, rep);
}
function soilTex({ base = '#946650', rows = 8, seed = 5, rep = [1, 1], furrows = true } = {}) {
  const [c, g] = cv(512, 512), R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 400; i++) { g.fillStyle = shade(base, .85 + R() * .3); g.globalAlpha = .5; g.beginPath(); g.ellipse(R() * 512, R() * 512, 6 + R() * 18, 4 + R() * 9, R() * 3, 0, 6.29); g.fill(); }
  if (furrows) for (let k = 0; k < rows; k++) {
    const y = (k + .5) * 512 / rows;
    g.globalAlpha = .9; g.fillStyle = shade(base, 1.22); g.fillRect(0, y - 14, 512, 9);
    g.fillStyle = shade(base, .62); g.fillRect(0, y + 8, 512, 5);
  }
  g.globalAlpha = .7; for (let i = 0; i < 160; i++) { g.fillStyle = shade(base, R() < .5 ? .6 : 1.3); g.beginPath(); g.arc(R() * 512, R() * 512, 1.5 + R() * 2, 0, 6.29); g.fill(); }
  g.globalAlpha = 1; return ctex(c, rep);
}
function pavingTex({ base = '#c9c4d6', slab = 128, rep = [1, 1] } = {}) {
  const [c, g] = cv(512, 512), R = rng(8); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += slab) { g.fillStyle = shade(base, .94 + R() * .1); g.fillRect(x, 0, slab, 512); }
  g.fillStyle = shade(base, .66); for (let x = 0; x <= 512; x += slab) g.fillRect(x - 2, 0, 4, 512);
  g.fillStyle = shade(base, 1.1); for (let x = 0; x <= 512; x += slab) g.fillRect(x + 2, 0, 3, 512);
  return ctex(c, rep);
}
function roadTex() {
  const [c, g] = cv(512, 512), R = rng(9), base = '#6a6e8c'; g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 500; i++) { g.fillStyle = shade(base, .85 + R() * .3); g.globalAlpha = .45; g.beginPath(); g.arc(R() * 512, R() * 512, 2 + R() * 6, 0, 6.29); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = '#f2d060'; for (let x = 0; x < 512; x += 128) g.fillRect(x + 16, 250, 72, 12);
  return ctex(c, [8, 1]);
}
function sidingTex({ base = '#9cc4e4', rep = [1, 1] } = {}) {
  const [c, g] = cv(512, 512), R = rng(4); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 32) {
    g.fillStyle = shade(base, .95 + R() * .08); g.fillRect(0, y, 512, 32);
    g.fillStyle = shade(base, 1.12); g.fillRect(0, y + 3, 512, 4);
    g.fillStyle = shade(base, .7); g.fillRect(0, y + 28, 512, 4);
  }
  return ctex(c, rep);
}
function shingleTex({ base = '#c8583a', rep = [1, 1] } = {}) {
  const [c, g] = cv(512, 512), R = rng(6); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0, r = 0; y < 512; y += 40, r++) for (let x = (r % 2) * 32 - 64; x < 512; x += 64) {
    g.fillStyle = shade(base, .9 + R() * .2); g.beginPath(); g.roundRect(x + 2, y, 60, 40, [0, 0, 14, 14]); g.fill();
    g.strokeStyle = shade(base, .6); g.lineWidth = 3; g.stroke();
  }
  return ctex(c, rep);
}
function barkTex() {
  const [c, g] = cv(256, 256), R = rng(12), base = '#93623e'; g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  g.lineWidth = 3; for (let i = 0; i < 40; i++) { g.strokeStyle = shade(base, R() < .6 ? .66 : 1.2); const x = R() * 256; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, 80, x - 8, 170, x + 4, 256); g.stroke(); }
  return ctex(c);
}
function ringsTex() {
  const [c, g] = cv(256, 256); g.fillStyle = '#e8c08a'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#b8864e'; g.lineWidth = 4; for (let r = 18; r < 128; r += 18) { g.beginPath(); g.arc(128 + Math.sin(r) * 4, 128, r, 0, 6.29); g.stroke(); }
  g.strokeStyle = '#7a4e2e'; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 121, 0, 6.29); g.stroke();
  return ctex(c);
}
// a weed tuft: tall blades fanning out of one root, some with seed heads or a dandelion; thin dark-green outlines
function weedTex(seed, flowers = '#ffd23a') {
  const [c, g] = cv(256, 256), R = rng(seed);
  const n = 11 + Math.floor(R() * 6);
  for (let i = 0; i < n; i++) {
    const a = (R() - .5) * 1.5, len = 140 + R() * 105, w = 7 + R() * 7, bx = 128 + (R() - .5) * 30;
    const tx = bx + Math.sin(a) * len, ty = 256 - Math.cos(a) * len, cx = bx + Math.sin(a) * len * .4 + (R() - .5) * 30, cy = 256 - len * .55;
    const col = ['#6ab446', '#86c850', '#5aa648', '#9ad25a', '#74bc4a'][i % 5];
    g.fillStyle = col; g.strokeStyle = '#2e6a32'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(bx - w, 256); g.quadraticCurveTo(cx - w * .5, cy, tx, ty); g.quadraticCurveTo(cx + w * .5, cy, bx + w, 256); g.closePath(); g.fill(); g.stroke();
    if (R() < .25) { g.fillStyle = '#c8b46a'; g.beginPath(); g.ellipse(tx, ty, 6, 15, a, 0, 6.29); g.fill(); g.stroke(); }
  }
  for (let i = 0; i < 2; i++) if (R() < .6) {
    const x = 70 + R() * 116, y = 70 + R() * 70; g.strokeStyle = '#3f8640'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - .5) * 20, 256); g.stroke();
    g.fillStyle = flowers; g.strokeStyle = '#8a6a1a'; g.lineWidth = 2; for (let k = 0; k < 8; k++) { g.beginPath(); g.ellipse(x + Math.cos(k * .785) * 9, y + Math.sin(k * .785) * 9, 7, 4, k * .785, 0, 6.29); g.fill(); g.stroke(); }
    g.fillStyle = '#f08a2a'; g.beginPath(); g.arc(x, y, 6, 0, 6.29); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function skyTex(top, mid, low) {
  const [c, g] = cv(64, 512); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, D(top)); gr.addColorStop(.38, D(mid)); gr.addColorStop(.5, D(low)); gr.addColorStop(1, D(low));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function cloudsTex() {
  const [c, g] = cv(2048, 256), R = rng(14);
  for (let k = 0; k < 9; k++) {
    const x = R() * 2048, y = 60 + R() * 120, s = 40 + R() * 40;
    g.fillStyle = D('#ffffff'); g.strokeStyle = D('#9aa8d8'); g.lineWidth = 3;
    g.beginPath(); for (let i = 0; i < 5; i++) g.ellipse(x + (i - 2) * s * .8, y - Math.sin(i / 4 * Math.PI) * s * .5, s * .7, s * .5, 0, 0, 6.29); g.fill();
    g.fillStyle = D('#dfe6fb'); g.fillRect(x - s * 2.2, y + s * .1, s * 4.4, s * .4);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
// far trees and hills around the world, unlit: cooler and paler with distance
function treelineTex(autumn = false) {
  const [c, g] = cv(4096, 512), R = rng(autumn ? 41 : 40);
  g.fillStyle = D('#9ab0d8'); g.beginPath(); g.moveTo(0, 512); for (let x = 0; x <= 4096; x += 64) g.lineTo(x, 250 - Math.sin(x / 600) * 60 - Math.sin(x / 230) * 20); g.lineTo(4096, 512); g.fill();
  const cols = autumn ? ['#d8823a', '#e8a840', '#c8603a', '#a8b050'] : ['#5e9a6a', '#4e8a6e', '#6aa86a', '#5a9080'];
  for (let i = 0; i < 160; i++) {
    const x = R() * 4096, y = 330 + R() * 70, r = 34 + R() * 40, col = cols[i % 4];
    g.fillStyle = D(col); g.strokeStyle = D(shade(col, .6)); g.lineWidth = 3;
    g.beginPath(); g.arc(x, y - r * .4, r, 0, 6.29); g.arc(x - r * .6, y, r * .7, 0, 6.29); g.arc(x + r * .6, y, r * .7, 0, 6.29); g.fill(); g.stroke();
  }
  g.fillStyle = D(autumn ? '#9a8a4a' : '#6a9a5a'); g.fillRect(0, 420, 4096, 92);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
// a sign board: light paint, dark lettering, a thin dark border (lit like the rest of the world)
function signTex(lines, { w = 1024, h = 640, ground = '#f6eedc', border = '#7a4a2a' } = {}) {
  const [c, g] = cv(w, h); g.fillStyle = ground; g.fillRect(0, 0, w, h);
  g.strokeStyle = border; g.lineWidth = 22; g.strokeRect(22, 22, w - 44, h - 44);
  g.strokeStyle = shade(ground, .75); g.lineWidth = 3; for (let y = 90; y < h - 40; y += 110) { g.beginPath(); g.moveTo(40, y); g.lineTo(w - 40, y); g.stroke(); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const L of lines) {
    g.font = `900 ${L.size}px ${FONT}`; g.lineJoin = 'round';
    if (L.stroke) { g.strokeStyle = L.stroke; g.lineWidth = L.size * .14; g.strokeText(L.text, w / 2, L.y); }
    g.fillStyle = L.color; g.fillText(L.text, w / 2, L.y);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------------------------------------------------------------- props built from code
// a pumpkin: a sphere pressed flat with eight ribs (real creases, so the ink pass draws them)
let _pumpGeo;
function pumpkinGeo() {
  if (_pumpGeo) return _pumpGeo;
  const geo = new THREE.SphereGeometry(.5, 40, 20), p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), rib = 1 - .09 * Math.pow(Math.abs(Math.cos(a * 4)), .6) * (1 - Math.abs(v.y) * 1.6);
    v.x *= rib; v.z *= rib; v.y *= .72; if (v.y > .3) v.y -= (v.y - .3) * .5; p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals(); return _pumpGeo = geo;
}
function goldenKey(s = 1) {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: '#f6c437', emissive: '#7a5200' });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.09 * s, .028 * s, 10, 28), m); ring.position.y = .2 * s; g.add(ring);
  const shaftM = new THREE.Mesh(new THREE.CylinderGeometry(.02 * s, .02 * s, .3 * s, 10), m); shaftM.position.y = -.02 * s; g.add(shaftM);
  for (const [y, w] of [[-.13, .07], [-.08, .05]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w * s, .03 * s, .02 * s), m); b.position.set(w * s / 2, y * s, 0); g.add(b); }
  return g;
}
function shovel3D() {
  const g = new THREE.Group();
  const h = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 1.1, 8), flat('#b8844a')); h.position.y = .55; g.add(h);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(.16, .05, .05), flat('#e8d6a8')); grip.position.y = 1.1; g.add(grip);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(.24, .3, .025), flat('#9aa6bc')); blade.position.y = -.1; g.add(blade);
  return g;
}
function signPost(tex, w, h, post = 2.2, { wood = '#b8844e' } = {}) {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, .06), [flat(wood), flat(wood), flat(wood), flat(wood), new THREE.MeshLambertMaterial({ map: tex }), flat(wood)]);
  board.position.y = post - h / 2; g.add(board);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.09, post + .3, .09), flat(wood)); p.position.set(s * (w / 2 - .12), post / 2 - .15, -.06); g.add(p); }
  g.board = board; return g;
}
function digger() {
  const g = new THREE.Group(), Y = flat('#f2c23a'), Dk = flat('#4a4a62'), Gl = new THREE.MeshLambertMaterial({ color: '#bcd8f0', emissive: '#203a5a' });
  for (const s of [-1, 1]) {
    const tr = new THREE.Mesh(new THREE.BoxGeometry(.26, .28, 1.3), Dk); tr.position.set(s * .42, .14, 0); g.add(tr);
    for (const z of [-.65, .65]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .27, 16), Dk); wh.rotation.z = Math.PI / 2; wh.position.set(s * .42, .14, z); g.add(wh); }
  }
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, .45, 1.1), Y); body.position.y = .5; g.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.02, .08, 1.12), Dk); stripe.position.y = .68; g.add(stripe);
  const cab = new THREE.Group(); cab.position.set(-.15, .72, -.1); g.add(cab);
  for (const [x, z] of [[-.3, -.3], [.3, -.3], [-.3, .3], [.3, .3]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.05, .8, .05), Y); p.position.set(x, .4, z); cab.add(p); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(.7, .06, .7), Y); roof.position.y = .82; cab.add(roof);
  const back = new THREE.Mesh(new THREE.BoxGeometry(.6, .5, .04), Gl); back.position.set(0, .45, -.3); cab.add(back);
  const boom = new THREE.Group(); boom.position.set(.3, .7, .45); g.add(boom);
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(.14, .14, .9), Y); b1.position.z = .45; boom.add(b1);
  const stick = new THREE.Group(); stick.position.z = .9; boom.add(stick);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .7), Y); b2.position.z = .35; stick.add(b2);
  const bucket = new THREE.Mesh(new THREE.BoxGeometry(.36, .24, .26), Dk); bucket.position.set(0, -.08, .72); stick.add(bucket);
  boom.rotation.x = .35; stick.rotation.x = .9;
  g.boom = boom; g.stick = stick; g.seat = V(-.15, .9, -.05);
  return g;
}

// ---------------------------------------------------------------- the overgrown ground (used twice: his yard, the field next door)
const crossGeo = (() => { const a = new THREE.PlaneGeometry(1, 1); a.translate(0, .5, 0); const b = a.clone(); b.rotateY(Math.PI / 2); return mergeGeometries([a, b]); })();
function jungle(scene, g, { x0, x1, z0, z1, n = 160, rocks = 20, stumps = 6, seed = 1, h = [.8, 1.6] }) {
  const R = rng(seed), out = { weeds: [], rocks: [], stumps: [] };
  const mats = [0, 1, 2].map(k => new THREE.MeshLambertMaterial({ map: weedTex(seed * 10 + k, k === 2 ? '#ffffff' : '#ffd23a'), alphaTest: .5, side: THREE.DoubleSide }));
  const per = Math.ceil(n / 3), inst = mats.map(m => { const im = new THREE.InstancedMesh(crossGeo, m, per); im.receiveShadow = true; g.add(im); (scene.userData.alphaCut ||= []).push(im); return im; });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const x = lerpN(x0, x1, R()), z = lerpN(z0, z1, R()), hh = lerpN(h[0], h[1], R()), ww = hh * (.8 + R() * .5), ry = R() * Math.PI;
    out.weeds.push({ k: i % 3, j: Math.floor(i / 3), x, z, hh, ww, ry, pull: R() });
    Q.setFromAxisAngle(V(0, 1, 0), ry); M.compose(V(x, 0, z), Q, V(ww, hh, ww)); inst[i % 3].setMatrixAt(Math.floor(i / 3), M);
  }
  inst.forEach((im, k) => { im.count = Math.floor((n - 1 - k) / 3) + 1; });     // an instance never set would stand at the origin
  out.inst = inst;
  for (let i = 0; i < rocks; i++) {
    const r = .18 + R() * .32, m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), flat(['#aeaac6', '#9c98b8', '#b8b2c8'][i % 3], { flatShading: true }));
    const x = lerpN(x0, x1, R()), z = lerpN(z0, z1, R()); m.position.set(x, r * .55, z); m.rotation.set(R() * 3, R() * 3, R() * 3); m.scale.y = .75; g.add(m);
    out.rocks.push({ m, home: m.position.clone(), r });
  }
  const bark = painted(barkTex()), top = painted(ringsTex());
  for (let i = 0; i < stumps; i++) {
    const r = .24 + R() * .16, hh = .3 + R() * .3, grp = new THREE.Group();
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, hh, 18), [bark, top, bark]); s.position.y = hh / 2; grp.add(s);
    for (let k = 0; k < 4; k++) { const a = k / 4 * 6.28 + R(), rt = new THREE.Mesh(new THREE.CylinderGeometry(.05, .08, .5, 8), bark); rt.position.set(Math.cos(a) * r * 1.2, .08, Math.sin(a) * r * 1.2); rt.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); grp.add(rt); }
    grp.position.set(lerpN(x0, x1, R()), 0, lerpN(z0, z1, R())); g.add(grp); out.stumps.push(grp);
  }
  return out;
}
// show weed i scaled by k (0 = gone), lifted by lift metres (pulled out)
function setWeed(J, i, k, lift = 0, tilt = 0) {
  const w = J.weeds[i], M = new THREE.Matrix4(), Q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, w.ry, 0));
  M.compose(V(w.x, lift, w.z), Q, V(w.ww * k + 1e-4, w.hh * k + 1e-4, w.ww * k + 1e-4)); J.inst[w.k].setMatrixAt(w.j, M);
}

// ---------------------------------------------------------------- YARD (x = 0)
const FENCE_Z = 4.9, SIDE_X = 6.6;
// spots where somebody stands or something happens: the weeds there stay low
const CLEAR = [[.45, .95], [1.05, .55], [1.55, .95], [-1.0, 1.2], [-3.1, -1.1], [-1.8, -.7], [-2.7, .45], [-1.35, .7], [2.9, -.6], [-.6, -2.4], [-4.0, -1.6], [-5.0, -.4], [-3.2, .1], [3.0, -3.4], [1.0, -1.6], [-.9, -.15], [-.4, .3], [.55, .4]];
function buildYard(scene) {
  const g = new THREE.Group(); scene.add(g); dyn.yard = g;
  // sky, clouds, far trees (unlit: their own light)
  dyn.skyDay = skyTex('#3f7ae0', '#8ab8f4', '#d6e6fb'); dyn.skyMorning = skyTex('#5a74d8', '#f0a8b8', '#ffd8b8'); dyn.skyAutumn = skyTex('#4a6ad0', '#f0b878', '#ffe2a8');
  const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 48, 24), new THREE.MeshBasicMaterial({ map: dyn.skyDay, side: THREE.BackSide, depthWrite: false }));
  sky.renderOrder = -10; scene.add(sky); dyn.sky = sky;
  const cl = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 60, 64, 1, true), new THREE.MeshBasicMaterial({ map: cloudsTex(), side: THREE.BackSide, transparent: true, depthWrite: false }));
  cl.position.y = 52; cl.material.map.repeat.set(2, 1); scene.add(cl); dyn.clouds = cl;
  dyn.treesG = treelineTex(false); dyn.treesA = treelineTex(true);
  const tl = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 16, 96, 1, true), new THREE.MeshBasicMaterial({ map: dyn.treesG, side: THREE.BackSide, transparent: true, alphaTest: .5 }));
  tl.material.map.repeat.set(3, 1); tl.position.y = 6.5; g.add(tl); dyn.treeline = tl; (scene.userData.alphaCut ||= []).push(tl);
  dyn.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshBasicMaterial({ color: HDR(3.2, 2.7, 1.6) })); dyn.sunDisc.layers.set(1); scene.add(dyn.sunDisc);
  // ground: lawn outside, the weedy yard inside the fence, the street in front
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), painted(grassTex({ rep: [40, 40] }))); lawn.rotation.x = -Math.PI / 2; g.add(lawn);
  const yd = new THREE.Mesh(new THREE.PlaneGeometry(2 * SIDE_X, FENCE_Z + 7.6), painted(grassTex({ base: '#7aa848', dirt: 4, seed: 7, rep: [4, 4] })));
  yd.rotation.x = -Math.PI / 2; yd.position.set(0, .006, (FENCE_Z - 7.6) / 2); g.add(yd); dyn.yardGround = yd;
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(2 * SIDE_X - .2, FENCE_Z + 5.9), painted(soilTex({ rows: 9, rep: [3, 1] })));
  soil.rotation.x = -Math.PI / 2; soil.rotation.z = Math.PI / 2; soil.position.set(0, .012, (FENCE_Z - 5.9) / 2); soil.visible = false; g.add(soil); dyn.soil = soil;
  const walk = new THREE.Mesh(new THREE.BoxGeometry(160, .1, 1.8), painted(pavingTex({ rep: [80, 1] }))); walk.position.set(0, .05, 6.3); g.add(walk);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(160, .14, .16), flat('#e2deea')); curb.position.set(0, .07, 7.25); g.add(curb);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(160, 6.2), painted(roadTex())); road.material.map.repeat.set(40, 1); road.rotation.x = -Math.PI / 2; road.position.set(0, .01, 10.4); g.add(road);
  const walk2 = new THREE.Mesh(new THREE.BoxGeometry(160, .1, 1.8), painted(pavingTex({ rep: [80, 1] }))); walk2.position.set(0, .05, 14.4); g.add(walk2);
  // his house: light blue siding, white trim, a terracotta roof, a porch
  const sid = painted(sidingTex({ rep: [3, 1] })), white = flat('#f6f2ea'), porchW = painted(woodTex({ base: '#c89a6a', rep: [2, 1] }));
  const house = new THREE.Mesh(new THREE.BoxGeometry(11, 3.3, 5.4), [sid, sid, flat('#9cc4e4'), flat('#9cc4e4'), sid, sid]); house.position.set(0, 1.65, -10.3); g.add(house);
  const rs = new THREE.Shape(); rs.moveTo(-6.0, 0); rs.lineTo(6.0, 0); rs.lineTo(0, 0); rs.closePath();
  const roofSh = new THREE.Shape(); roofSh.moveTo(-3.2, 0); roofSh.lineTo(3.2, 0); roofSh.lineTo(0, 2.1); roofSh.closePath();
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofSh, { depth: 12, bevelEnabled: false }), [painted(shingleTex({ rep: [.45, .6] })), flat('#f6f2ea')]);
  roof.rotation.y = Math.PI / 2; roof.position.set(-6, 3.3, -10.3); g.add(roof);
  const trim = (w, h, d, x, y, z, m = white) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  trim(11.2, .16, .2, 0, 3.32, -7.56);
  for (const x of [-5.55, 5.55]) trim(.18, 3.3, .18, x, 1.65, -7.58);
  const door = trim(1.0, 2.1, .1, -2, 1.5, -7.55, flat('#c8323a')); trim(1.24, .12, .14, -2, 2.6, -7.52); for (const s of [-1, 1]) trim(.12, 2.2, .14, -2 + s * .56, 1.5, -7.52);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), flat('#f2c23a')); knob.position.set(-1.65, 1.45, -7.48); g.add(knob);
  const glassM = new THREE.MeshBasicMaterial({ color: '#cfe4f8' });
  for (const x of [-4.1, 2.4, 4.2]) {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.2), glassM); gl.position.set(x, 1.85, -7.58); g.add(gl);
    trim(1.3, .12, .14, x, 2.51, -7.52); trim(1.4, .12, .2, x, 1.2, -7.5); for (const s of [-1, 1]) trim(.12, 1.3, .14, x + s * .6, 1.85, -7.52);
    trim(.06, 1.2, .08, x, 1.85, -7.53); trim(1.1, .06, .08, x, 1.85, -7.53);
    for (const s of [-1, 1]) { const sh = trim(.4, 1.3, .06, x + s * .9, 1.85, -7.54, flat('#3f7a5a')); for (let k = 0; k < 5; k++) trim(.34, .04, .08, x + s * .9, 1.4 + k * .22, -7.52, flat('#2f6046')); }
  }
  // porch: a deck, steps, posts, a rail, a roof
  trim(5.6, .45, 1.8, -2.2, .225, -6.7, porchW);
  for (let k = 0; k < 2; k++) trim(1.3, .15, .34, -2, .075 + k * .15, -5.63 + k * -.0 + (1 - k) * .34 - .17, porchW);
  for (const x of [-4.9, -2.85, -1.15, .5]) trim(.14, 2.5, .14, x, 1.7, -5.88);
  trim(5.8, .14, 2.0, -2.2, 2.98, -6.75, white);
  for (const [a, b] of [[-4.9, -2.85], [-1.15, .5]]) { trim(b - a, .08, .08, (a + b) / 2, 1.3, -5.88); for (let x = a + .2; x < b; x += .22) trim(.05, .8, .05, x, .9, -5.88); }
  // bushes along the house
  for (const [x, r] of [[-5.0, .5], [1.3, .55], [3.3, .48], [5.0, .5]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), flat('#4f9a52')); b.position.set(x, r * .7, -7.1); b.scale.y = .8; g.add(b); }
  // trees in the corners: trunks and round canopies (autumn turns them orange)
  dyn.canopy = flat('#5aa652'); const trunk = painted(barkTex());
  for (const [x, z, s] of [[-9.0, -3.5, 1.2], [-8.6, 2.6, 1.0], [-10.5, -8.5, 1.3], [7.5, -10, 1.2]]) {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(.18 * s, .26 * s, 2.6 * s, 10), trunk); tr.position.set(x, 1.3 * s, z); g.add(tr);
    for (const [dx, dy, dz, r] of [[0, 3.1, 0, 1.2], [.8, 2.6, .3, .8], [-.7, 2.7, -.2, .85], [.1, 3.7, .2, .8]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(r * s, 16, 12), dyn.canopy); c.position.set(x + dx * s, dy * s, z + dz * s); g.add(c); }
  }
  // the picket fence and the gate
  const pk = new THREE.BoxGeometry(.09, 1.0, .04), pkM = flat('#f6f2ea'), picks = [];
  for (let x = -SIDE_X; x <= SIDE_X + .01; x += .2) if (Math.abs(x) > .85) picks.push([x, FENCE_Z, 0]);
  for (let z = -7.4; z < FENCE_Z; z += .2) { picks.push([-SIDE_X, z, Math.PI / 2]); picks.push([SIDE_X, z, Math.PI / 2]); }
  const fence = new THREE.InstancedMesh(pk, pkM, picks.length), M = new THREE.Matrix4();
  picks.forEach(([x, z, r], i) => { M.makeRotationY(r).setPosition(x, .5, z); fence.setMatrixAt(i, M); }); fence.castShadow = fence.receiveShadow = true; g.add(fence);
  for (const y of [.3, .78]) { for (const s of [-1, 1]) { trim(SIDE_X - .85, .08, .05, s * (SIDE_X + .85) / 2, y, FENCE_Z - .04, pkM); trim(.05, .08, FENCE_Z + 7.4, s * SIDE_X - s * .04, y, (FENCE_Z - 7.4) / 2, pkM); } }
  for (const s of [-1, 1]) trim(.16, 1.25, .16, s * .9, .62, FENCE_Z, flat('#e8e2d6'));
  const gate = new THREE.Group(); gate.position.set(.82, 0, FENCE_Z); g.add(gate); dyn.gate = gate;
  for (let k = 0; k < 8; k++) { const p = new THREE.Mesh(pk, pkM); p.position.set(-.1 - k * .2, .5, 0); gate.add(p); }
  for (const y of [.3, .78]) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.6, .08, .05), pkM); r.position.set(-.8, y, -.04); gate.add(r); }
  // the sign at the gate (it goes up on "He puts up a sign")
  const sg = signPost(signTex([{ text: 'DIG FOR THE', y: 150, size: 120, color: '#3a2a4a' }, { text: 'GOLDEN KEY', y: 320, size: 160, color: '#f2b62a', stroke: '#6a3a10' }, { text: '$5 A DAY', y: 500, size: 130, color: '#c8323a' }]), 1.7, 1.06, 1.95);
  sg.position.set(1.9, 0, FENCE_Z + .32); sg.rotation.y = -.25; g.add(sg); dyn.sign = sg;
  // the pumpkin stand on the pavement (autumn)
  const stand = new THREE.Group(); stand.position.set(-2.8, .1, 6.05); g.add(stand); dyn.stand = stand;
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, .08, .8), porchW); top.position.y = .78; stand.add(top);
  for (const [x, z] of [[-.9, -.32], [.9, -.32], [-.9, .32], [.9, .32]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.08, .78, .08), porchW); l.position.set(x, .39, z); stand.add(l); }
  const pmat = flat('#f8b84a'), stemM = flat('#5a7a3a');
  for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(pumpkinGeo(), pmat); const s = .32 + (k % 2) * .08; p.scale.setScalar(s); p.position.set(-.76 + k * .38, .82 + s * .36, (k % 2) * .12 - .06); stand.add(p); }
  const sb = signPost(signTex([{ text: 'PUMPKINS', y: 330, size: 190, color: '#e8701a', stroke: '#5a2a0a' }], { h: 640 }), 1.1, .5, 1.5); sb.position.set(-1.25, 0, .1); sb.rotation.y = .3; stand.add(sb);
  // houses across the street (a block)
  for (const [x, col, rc] of [[-17, '#f2d27a', '#7a6ad0'], [-6, '#a8e0c8', '#c8583a'], [5, '#f2b0b8', '#4a6ab8'], [16, '#c8c0f0', '#c8583a']]) {
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(7, 3.0, 5), painted(sidingTex({ base: col, rep: [2, 1] }))); h2.position.set(x, 1.5, 20); g.add(h2);
    const r2 = new THREE.Mesh(new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); s.moveTo(-2.8, 0); s.lineTo(2.8, 0); s.lineTo(0, 1.8); s.closePath(); return s; })(), { depth: 7.6, bevelEnabled: false }), [painted(shingleTex({ base: rc, rep: [.45, .6] })), flat(col)]);
    r2.rotation.y = Math.PI / 2; r2.position.set(x - 3.8, 3.0, 20); g.add(r2);
    for (const dx of [-2, 2]) { const w2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.1), glassM); w2.position.set(x + dx, 1.7, 17.48); w2.rotation.y = Math.PI; g.add(w2); }
    const d2 = new THREE.Mesh(new THREE.BoxGeometry(.9, 2, .08), flat(shade(col, .6))); d2.position.set(x, 1.0, 17.5); g.add(d2);
  }
  // the jungle in his yard, and the field next door (stays wild until the very end)
  dyn.J = jungle(scene, g, { x0: -6.2, x1: 6.2, z0: -5.4, z1: 4.4, n: 260, rocks: 22, stumps: 6, seed: 3, h: [.55, 1.1] });
  const fld = new THREE.Mesh(new THREE.PlaneGeometry(16, 12.4), painted(grassTex({ base: '#7aa848', dirt: 4, seed: 9, rep: [4, 4] }))); fld.rotation.x = -Math.PI / 2; fld.position.set(SIDE_X + 8.1, .006, -1.2); g.add(fld);
  dyn.N = jungle(scene, g, { x0: 7.0, x1: 21, z0: -7, z1: 4.4, n: 220, rocks: 16, stumps: 5, seed: 8, h: [.9, 1.8] });
  for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(.12, .9, .12), flat('#9a7a5a')); p.position.set(8 + k * 2.4, .45, FENCE_Z); p.rotation.z = (hash(k) - .5) * .3; g.add(p); }
  { const r = new THREE.Mesh(new THREE.BoxGeometry(12, .06, .05), flat('#9a7a5a')); r.position.set(14, .7, FENCE_Z); r.rotation.z = -.03; g.add(r); }
  const sold = signPost(signTex([{ text: 'SOLD', y: 320, size: 300, color: '#ffffff', stroke: '#7a1010' }], { ground: '#d8323a', border: '#ffffff' }), 1.3, .8, 1.7);
  sold.position.set(9.95, 0, FENCE_Z + .3); sold.rotation.y = -.15; g.add(sold); dyn.sold = sold;
  const sg2 = signPost(signTex([{ text: 'DIG FOR THE', y: 150, size: 120, color: '#3a2a4a' }, { text: 'GOLDEN KEY', y: 320, size: 160, color: '#f2b62a', stroke: '#6a3a10' }, { text: '$5 A DAY', y: 500, size: 130, color: '#c8323a' }]), 1.7, 1.06, 1.95);
  sg2.position.set(12.0, 0, FENCE_Z + .35); sg2.rotation.y = -.3; g.add(sg2); dyn.sign2 = sg2;
  // holes and dirt mounds: they appear one by one while the town digs
  dyn.holes = []; const R = rng(21), holeM = flat('#4a2e3c'), moundM = flat('#9a6a4a');
  for (let i = 0; i < 46; i++) {
    const x = lerpN(-5.6, 5.6, R()), z = lerpN(-4.8, 3.9, R()), grp = new THREE.Group(); grp.position.set(x, 0, z);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(.34, 20), holeM); hole.rotation.x = -Math.PI / 2; hole.position.y = .02; grp.add(hole);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(.38, 16, 10), moundM); mound.scale.set(1, .38, 1); mound.position.set(.5, 0, .15); grp.add(mound);
    grp.visible = false; g.add(grp); dyn.holes.push({ grp, at: 0 });
  }
  // the crops: pumpkins in rows (autumn), sprouts in rows (spring)
  const rows = []; for (let z = -4.6; z <= 3.8; z += .95) for (let x = -5.6; x <= 5.6; x += .95) rows.push([x + (hash(rows.length) - .5) * .3, z + (hash(rows.length, 2) - .5) * .2]);
  dyn.pumpkins = new THREE.InstancedMesh(pumpkinGeo(), flat('#f8b84a'), rows.length); dyn.leaves = new THREE.InstancedMesh(crossGeo, new THREE.MeshLambertMaterial({ map: weedTex(77), alphaTest: .5, side: THREE.DoubleSide }), rows.length);
  dyn.sprouts = new THREE.InstancedMesh(crossGeo, new THREE.MeshLambertMaterial({ map: weedTex(88), alphaTest: .5, side: THREE.DoubleSide }), rows.length);
  rows.forEach(([x, z], i) => {
    const s = .5 + hash(i, 3) * .35; M.compose(V(x, s * .34, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), hash(i, 4) * 6), V(s, s, s)); dyn.pumpkins.setMatrixAt(i, M);
    M.compose(V(x + .3, 0, z - .2), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), hash(i, 5) * 3), V(.9, .5, .9)); dyn.leaves.setMatrixAt(i, M);
    M.compose(V(x, 0, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), hash(i, 6) * 3), V(.32, .26, .32)); dyn.sprouts.setMatrixAt(i, M);
  });
  dyn.pumpkins.castShadow = dyn.pumpkins.receiveShadow = true; dyn.leaves.receiveShadow = true;
  for (const m of [dyn.pumpkins, dyn.leaves, dyn.sprouts]) { m.visible = false; g.add(m); }
  scene.userData.alphaCut.push(dyn.leaves, dyn.sprouts);
  // hook props: a shovel stuck in the ground, the golden key (falls into a hole)
  dyn.shovel = shovel3D(); dyn.shovel.position.set(1.55, .1, .95); dyn.shovel.rotation.set(.12, .4, -.18); g.add(dyn.shovel);
  dyn.hookHole = new THREE.Group(); dyn.hookHole.position.set(1.05, 0, .55); g.add(dyn.hookHole);
  { const h = new THREE.Mesh(new THREE.CircleGeometry(.36, 24), holeM); h.rotation.x = -Math.PI / 2; h.position.y = .02; dyn.hookHole.add(h);
    const m = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 10), moundM); m.scale.set(1, .42, 1); m.position.set(-.55, 0, -.1); dyn.hookHole.add(m); }
  dyn.key = goldenKey(1.4); g.add(dyn.key); dyn.keyGlow = glow(scene, [0, 0, 0], '#ffd870', .55, .55);
  // the tiny digger
  dyn.digger = digger(); g.add(dyn.digger);
  // light: the sun is the key (warm, real shadows), the sky is the fill (cool)
  const L = new THREE.Group();
  dyn.hemi = new THREE.HemisphereLight('#a8bcff', '#8a7a8a', 1.45); L.add(dyn.hemi);
  const sun = new THREE.DirectionalLight('#ffe0a6', 3.0); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 120 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
  L.add(sun); L.add(sun.target); dyn.sun = sun;
  scene.add(L); dyn.yardL = L;
  shadows(g);
  sky.receiveShadow = false; tl.receiveShadow = false;
}

// ---------------------------------------------------------------- FARM (x = 300): the explainer
function buildFarm(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g); dyn.farm = g;
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), painted(grassTex({ base: '#8cc152', seed: 11, rep: [24, 24] }))); gr.rotation.x = -Math.PI / 2; g.add(gr);
  const fld = new THREE.Mesh(new THREE.PlaneGeometry(14, 9), painted(grassTex({ base: '#82a64a', dirt: 5, seed: 12, rep: [4, 3] }))); fld.rotation.x = -Math.PI / 2; fld.position.set(0, .006, -1.5); g.add(fld);
  dyn.F = jungle(scene, g, { x0: -6.5, x1: 6.5, z0: -6, z1: 1.8, n: 150, rocks: 18, stumps: 5, seed: 13, h: [.7, 1.4] });
  // a red barn behind
  const barn = new THREE.Mesh(new THREE.BoxGeometry(7, 4, 5), painted(woodTex({ base: '#c8423a', plank: 48, rep: [3, 1], vertical: true }))); barn.position.set(-2, 2, -12); g.add(barn);
  const bs = new THREE.Shape(); bs.moveTo(-2.8, 0); bs.lineTo(2.8, 0); bs.lineTo(1.6, 1.6); bs.lineTo(0, 2.4); bs.lineTo(-1.6, 1.6); bs.closePath();
  const br = new THREE.Mesh(new THREE.ExtrudeGeometry(bs, { depth: 7.4, bevelEnabled: false }), [painted(shingleTex({ base: '#6a6ab8', rep: [.45, .6] })), flat('#c8423a')]); br.rotation.y = Math.PI / 2; br.position.set(-5.7, 4, -12); g.add(br);
  for (const [w, h, x, y] of [[2.2, .16, -2, 2.6], [.16, 2.6, -3.0, 1.3], [.16, 2.6, -1.0, 1.3]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .12), flat('#f6f2ea')); b.position.set(x, y, -9.45); g.add(b); }
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(.06, 2.5, .06), flat('#f6f2ea')); d.position.set(-2, 1.25, -9.44); d.rotation.z = s * .72; g.add(d); }
  const silo = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 24), flat('#c8c4dc')); silo.position.set(3, 3, -12.5); g.add(silo);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 12, 0, 6.29, 0, Math.PI / 2), flat('#6a6ab8')); cap.position.set(3, 6, -12.5); g.add(cap);
  // the big price tag: a card on a string (unlit text, swings)
  const [c, t] = cv(1024, 560);
  t.fillStyle = D('#fff4d2'); t.strokeStyle = PLUM; t.lineWidth = 18; t.beginPath(); t.moveTo(150, 30); t.lineTo(1000, 30); t.lineTo(1000, 530); t.lineTo(150, 530); t.lineTo(20, 280); t.closePath(); t.fill(); t.stroke();
  t.fillStyle = D('#f6e6b8'); t.beginPath(); t.arc(120, 280, 34, 0, 6.29); t.fill(); t.stroke();
  t.font = `900 240px ${FONT}`; t.textAlign = 'center'; t.textBaseline = 'middle'; t.lineJoin = 'round';
  t.strokeStyle = D('#1c4a2a'); t.lineWidth = 30; t.strokeText('$$$$', 590, 290); t.fillStyle = D('#3fb85a'); t.fillText('$$$$', 590, 290);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshBasicMaterial({ map: (() => { const x = new THREE.CanvasTexture(c); x.colorSpace = THREE.SRGBColorSpace; return x; })(), transparent: true, alphaTest: .3, side: THREE.DoubleSide }));
  const pivot = new THREE.Group(); pivot.position.set(-.2, 3.7, -1.2); g.add(pivot); tag.position.set(.95, -.75, 0); tag.rotation.z = .3; tag.layers.set(1); pivot.add(tag); dyn.tag = pivot;
  const str = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .7, 4), new THREE.MeshBasicMaterial({ color: PLUM })); str.position.y = -.2; str.layers.set(1); pivot.add(str);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#a8bcff', '#8a7a8a', 1.45));
  const sun = new THREE.DirectionalLight('#ffe0a6', 3.0); sun.position.set(285, 22, 14); sun.target.position.set(300, 0, -2); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
  L.add(sun); L.add(sun.target); scene.add(L); dyn.farmL = L; dyn.farmSun = V(15, -22, -16).normalize();
  shadows(g);
}

// ---------------------------------------------------------------- CAST
export const LOOK = {
  him: { hat: 'straw', cloth: '#3d6fc0', buttons: '#f2c23a', mustache: true, hair: '#5a3a28', height: 1.76, pocket: true },
  wife: { hat: 'bun', hairColor: '#7a3a2a', body: 'robe', cloth: '#d8506a', sash: '#f2c23a', height: 1.66, headW: 262, headH: 248, collar: false },
  dad: { hat: 'cap', hatColor: '#e0503a', cloth: '#4aa86a', height: 1.8, mustache: true, hair: '#3a2a24' },
  mom: { hat: 'bun', hairColor: '#e8b850', body: 'robe', cloth: '#6a7ad8', height: 1.66, headW: 262, headH: 248, collar: false },
  kid1: { hat: 'cap', hatColor: '#f2c23a', cloth: '#f08a3a', height: 1.08, headW: 290, headH: 270 },
  kid2: { hat: 'bun', hairColor: '#4a2a20', body: 'robe', cloth: '#a05ac8', height: 1.0, headW: 290, headH: 270, collar: false },
  detect: { hat: 'cap', hatColor: '#3a8ad8', cloth: '#8a5ad0', mustache: true, hair: '#2e2026', height: 1.74, pattern: 'stripes' },
  driver: { hat: 'cap', hatColor: '#f2862a', cloth: '#e0503a', height: 1.7, buttons: '#f6f2ea' },
  pull1: { hat: 'kulah', hatColor: '#3d8a8a', cloth: '#d8a03a', height: 1.7, pocket: true },
  pull2: { hat: 'cap', hatColor: '#c8323a', cloth: '#3aa8b8', height: 1.62, mustache: true, hair: '#4a3020' },
  farmer: { hat: 'straw', hatColor: '#e2d08a', hatBand: '#3a7a4a', cloth: '#8a5a3a', mustache: '#e8e0d6', height: 1.74, buttons: '#f2c23a' },
  crew1: { hat: 'cap', hatColor: '#f2c23a', cloth: '#e0703a', height: 1.72 },
  crew2: { hat: 'kulah', hatColor: '#5a6ab8', cloth: '#5ab06a', height: 1.66, mustache: true, hair: '#2e2026' },
  crew3: { hat: 'cap', hatColor: '#3a8ad8', cloth: '#c8508a', height: 1.7, pocket: true },
};
// extra copies of a drawn character (same drawing, another place): the queue around the block, the crowd
function extra(toon) {
  const m = new THREE.Mesh(toon.mesh.geometry, toon.mat); m.layers.set(1); C.scene.add(m);
  const s = new THREE.Mesh(toon.shadow.geometry, toon.shadow.material); s.layers.set(1); s.renderOrder = -1; C.scene.add(s);
  const e = { m, s, toon, hide() { m.visible = s.visible = false; }, place(x, y, z, sc = 1) { m.visible = s.visible = true; m.position.set(x, y, z); m.scale.setScalar(sc); m.rotation.y = Math.atan2(C.cam.position.x - x, C.cam.position.z - z); s.position.set(x, y + .012, z); s.scale.set(sc * .82, 1, sc * .55); s.rotation.y = m.rotation.y; } };
  extras.push(e); return e;
}

// ---------------------------------------------------------------- CAMERA (seconds come from words)
function cameraPath() {
  const t = W;
  const keys = [
    // HOOK: four pictures in five seconds, one per phrase
    { t: 0, pos: [1.25, 1.32, 3.05], look: [.45, 1.42, 1.0], fov: 38, creep: .3, drift: .05 },                        // he grins, the key held high
    { t: t('buried') + .15, dur: .45, pos: [1.6, .95, 1.75], look: [1.0, .15, .5], fov: 44, creep: .3, drift: .04 },  // the key drops into the hole
    { t: t('backyard.') + .35, dur: .55, pos: [3.0, 5.2, 10.5], look: [0, .4, -1.2], fov: 50, creep: .28 },             // the jungle
    { t: t('well') + .2, dur: .3, move: 'whip', pos: [2.25, 1.15, 2.35], look: [1.05, .1, .55], fov: 30, creep: .3, drift: .03 },   // the key, glinting in the hole
    { t: t('his', 2) + .1, dur: .32, move: 'whip', pos: [-4.5, 7.2, 9.5], look: [0, 0, -1.5], fov: 52, creep: .2 },
    { t: t('stumps.') - .2, dur: 2.2, pos: [3.5, 6.0, 8.6], look: [0, 0, -1.8], fov: 50, creep: .25 },
    { t: t('wife') + .15, dur: .32, move: 'whip', pos: [-1.3, 1.6, -2.6], look: [-2.0, 1.5, -6.35], fov: 40, creep: .27, drift: .05 },
    { t: t('puts') + .2, dur: .32, move: 'whip', pos: [3.4, 1.35, 9.0], look: [1.4, 1.35, 5.3], fov: 44, creep: .26 },
    { t: t('dig') + .1, dur: .9, pos: [2.0, 1.6, 9.2], look: [1.6, 1.3, 5.2], fov: 52, creep: .28, drift: .04 },
    { t: t('saturday,') + .05, dur: .32, move: 'whip', pos: [-5.5, 9.5, 17.5], look: [-6, 0, 5.2], fov: 52, creep: .22 },
    { t: t('families') + .05, dur: .32, move: 'whip', pos: [-1.3, 1.45, 3.4], look: [-2.4, .85, -1.0], fov: 50, creep: .26 },
    { t: t('metal') - .25, dur: .8, pos: [4.6, 1.25, 2.6], look: [2.9, .8, -.6], fov: 46, creep: .27 },
    { t: t('another') + .05, dur: .7, pos: [3.4, 2.3, 2.2], look: [.2, .5, 4.9], fov: 50, creep: .2 },
    { t: t('people') + .1, dur: .32, move: 'whip', pos: [-3.0, 1.35, 1.2], look: [-4.3, .9, -2.6], fov: 48, creep: .27 },
    { t: t('roll') + .05, dur: .8, pos: [5.0, 2.6, 3.8], look: [2.4, .5, -2.8], fov: 50, creep: .25 },
    { t: t('weeks') + .02, dur: .32, move: 'whip', pos: [0, 9.2, 10.5], look: [0, 0, -1.2], fov: 50, creep: .12 },
    { t: t('every') - .2, dur: .32, move: 'whip', pos: [1.2, 1.45, 9.0], look: [-.45, 1.2, 5.0], fov: 46, creep: .27 },
    { t: t('you') - .05, dur: .32, move: 'whip', pos: [302.6, 2.0, 8.6], look: [300.9, 1.5, -1.0], fov: 50, creep: .22 },
    { t: t('crews') + .1, dur: 1.4, pos: [300.4, 1.8, 6.6], look: [301.3, 1.2, -.8], fov: 50, creep: .25 },
    { t: t('got') - .1, dur: .32, move: 'whip', pos: [.9, 1.5, 7.6], look: [.05, 1.4, 4.85], fov: 38, creep: .3, drift: .04 },
    { t: t('when') + .05, dur: .32, move: 'whip', pos: [0, 4.6, -4.6], look: [0, .4, 5.6], fov: 52, creep: .22 },
    { t: t('soft,') - .1, dur: 1.4, pos: [-2.5, 7.6, 9.8], look: [0, 0, -1.5], fov: 50, creep: .25 },
    { t: t('plants') + .05, dur: .32, move: 'whip', pos: [1.0, 1.35, 3.1], look: [-.6, .75, -.2], fov: 46, creep: .27 },
    { t: t('autumn,') - .05, dur: .32, move: 'whip', pos: [-5.0, 1.6, 7.0], look: [-1.0, .5, -1.0], fov: 50, creep: .2 },
    { t: t('biggest') + .1, dur: 1.6, pos: [-2.0, 4.8, 9.6], look: [0, .2, -1.5], fov: 52, creep: .25 },
    { t: t('who') + .02, dur: .32, move: 'whip', pos: [-1.2, 1.7, 12.2], look: [-2.2, 1.1, 6.2], fov: 46, creep: .27 },
    { t: t('next') - .05, dur: .32, move: 'whip', pos: [1.3, 1.36, 2.6], look: [.55, 1.45, .4], fov: 38, creep: .3, drift: .05 },
    { t: t('field') - .35, dur: 1.0, pos: [10.9, 2.2, 13.0], look: [10.95, 1.1, 4.4], fov: 50, creep: .3, drift: .04 },
  ];
  const cp = new CamPath(keys, { fps: FPS });
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx; W = wordTimes(ctx.words); window.__dyn = dyn;
  DUR = Math.ceil((ctx.words[ctx.words.length - 1].end + .6) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#8ab8f4');
  buildYard(scene); buildFarm(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  // the queue around the block: copies of the townsfolk
  dyn.queue = []; const qs = ['dad', 'mom', 'kid1', 'detect', 'pull1', 'pull2', 'kid2', 'crew1', 'crew2', 'crew3', 'driver', 'farmer'];
  for (let i = 0; i < 26; i++) dyn.queue.push(extra(cast[qs[i % qs.length]]));
  // dust from the shovels, seeds from the bag
  dyn.dirt = new Smoke(scene, { color: '#8a5a40', maxPoints: 800, H: ctx.H });
  dyn.seeds = new Smoke(scene, { color: '#f6e8b8', maxPoints: 300, H: ctx.H });
  dyn.sparkle = new Smoke(scene, { color: '#fff2b0', maxPoints: 200, H: ctx.H, additive: true });
  dyn.cam = cameraPath();
  // sound cues for audio/mix.py (the first three whooshes mark the big set changes for the score)
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(W('you') - .37, 'whoosh'); cue(W('got') - .42, 'whoosh'); cue(W('autumn,') - .37, 'whoosh');
  for (const w of [['well'], ['his', 2], ['wife'], ['puts'], ['saturday,'], ['families'], ['people'], ['weeks'], ['every'], ['when'], ['plants'], ['who'], ['next']]) cue(W(...w) - .1, 'rise', { dur: .35 });
  cue(W('buried') + .3, 'boom'); cue(W('worth'), 'shimmer');
  cue(W('puts') + .5, 'lock'); cue(W('puts') + .85, 'lock'); cue(W('sign.') + .2, 'lock');
  cue(W('families'), 'scrape', { dur: W('metal') - W('families') }); cue(W('detector.'), 'shimmer'); cue(W('rents'), 'simmer', { dur: 1.6 });
  cue(W('rip') + .2, 'boom'); cue(W('every') + .3, 'shimmer'); cue(W('paid') + .1, 'shimmer'); cue(W('free.'), 'shimmer');
  cue(W('plants') + .3, 'pen', { dur: 1.2 }); cue(W('bought') + .05, 'lock'); cue(W('just') + .1, 'boom');
}

// ---------------------------------------------------------------- PER FRAME
const SUN = {                                      // direction the sunlight travels, colour, strength, sky fill
  day: { dir: V(.55, -.66, -.5), col: '#ffe0a6', k: 3.0, hemi: 1.45, sky: '#a8bcff' },
  morning: { dir: V(.9, -.3, -.3), col: '#ffb8a0', k: 2.7, hemi: 1.25, sky: '#b0a8ff' },
  autumn: { dir: V(.8, -.42, -.42), col: '#ffc070', k: 2.9, hemi: 1.35, sky: '#9cacff' },
};
const DAY = '#e8e3f4', WARMRIM = '#ffd08a';
function setSun(s, t) {
  const sun = dyn.sun, d = s.dir.clone().normalize();
  sun.position.copy(V(0, 0, 0).addScaledVector(d, -60)); sun.target.position.set(0, 0, 0);
  sun.color.set(s.col); sun.intensity = s.k; dyn.hemi.intensity = s.hemi; dyn.hemi.color.set(s.sky);
  dyn.sunDisc.position.copy(C.cam.position).addScaledVector(d, -150); dyn.sunDisc.lookAt(C.cam.position);
}
export function frame(t, ctx) {
  const { cam, env } = ctx, T = W;
  const cp = dyn.cam.apply(cam, t);
  const where = cam.position.x < 150 ? 'yard' : 'farm';
  dyn.yard.visible = dyn.yardL.visible = where === 'yard'; dyn.farm.visible = dyn.farmL.visible = where === 'farm';
  const A = (w, n) => W(w, n) - 2 / FPS;
  const bl = (seed, ...sw) => blinkAt(t, seed, sw, FPS);
  for (const c of Object.values(cast)) c.hide();
  for (const e of extras) e.hide();
  // ---- season / state (switched inside whips)
  const tAutumn = T('autumn,') - .2, tSpring = T('next') - .2, tMorning = T('every') - .35, tDay2 = T('got') - .25, tLapse = T('weeks') - .15;
  let season = 'day';
  if (t >= tMorning && t < tDay2) season = 'morning';
  if (t >= tAutumn && t < tSpring) season = 'autumn';
  const sun = { ...SUN[season] };
  if (t >= tLapse && t < tMorning) {                                // "Weeks go by": the sun runs round the sky, day after day
    const u = (t - tLapse) * 2.2, a = u * Math.PI * 2;
    sun.dir = V(Math.cos(a) * .8, -.35 - .35 * Math.abs(Math.sin(a * .5 + .3)), Math.sin(a) * .6 - .3);
    sun.k = 1.6 + 1.6 * Math.abs(Math.sin(a * .5 + .3)); sun.hemi = .9 + .6 * Math.abs(Math.sin(a * .5 + .3));
  }
  setSun(sun, t);
  dyn.sky.material.map = season === 'morning' ? dyn.skyMorning : season === 'autumn' ? dyn.skyAutumn : dyn.skyDay;
  dyn.treeline.material.map = season === 'autumn' ? dyn.treesA : dyn.treesG;
  dyn.canopy.color.set(season === 'autumn' ? '#e8902a' : '#5aa652');
  dyn.clouds.rotation.y = t * .004 + (t >= tLapse && t < tMorning ? (t - tLapse) * .8 : 0);
  // ---- the yard's state
  const J = dyn.J, tPull = T('people') + .2, tPullEnd = T('better.') + .4, tRoll = T('roll'), tRip = T('rip'), tClear = T('weeks'), tFlat = T('when') - .25;
  const flat_ = t >= tFlat;
  J.weeds.forEach((w, i) => {
    let k = 1, lift = 0, tilt = 0;
    if (flat_) k = 0;
    else if (t > tPull) {
      const near = w.x < -1.5 && w.z < 1.5 && w.z > -4.5;             // the ones in the shot come out one by one, with a jerk
      const tp = near ? lerpN(tPull + .2, tPullEnd - .3, w.pull) : lerpN(tPull, tClear, w.pull);
      const u = (t - tp) / .35;
      if (u > 0) { lift = Math.min(1, u) * .5 + Math.max(0, u - 1) * 2.5; tilt = Math.min(1, u) * .6; k = Math.max(0, 1 - Math.max(0, u - 1) * 1.5); }
    }
    const dc = Math.hypot(w.x - cam.position.x, w.z - cam.position.z);
    if (dc < 1.5 && cam.position.y < 2.5) k *= Math.max(0, (dc - 1.1) / .4);
    for (const [cx, cz] of CLEAR) if (Math.hypot(w.x - cx, w.z - cz) < .55) k = Math.min(k, .45);
    setWeed(J, i, k, lift, tilt);
  });
  J.inst.forEach(m => m.instanceMatrix.needsUpdate = true);
  J.rocks.forEach((r, i) => {                                       // the rocks roll to a pile by the side fence
    const pile = V(5.6 - (i % 4) * .42, r.r * .55 + Math.floor(i / 8) * .3, -5.2 + Math.floor(i / 4) % 2 * .45);
    const u = ramp(t, lerpN(tRoll, tRip + .6, hash(i, 7)), lerpN(tRoll, tRip + .6, hash(i, 7)) + .7);
    r.m.position.copy(r.home).lerp(pile, flat_ ? 1 : u); r.m.position.y += Math.sin(u * Math.PI) * .25;
    r.m.rotation.x = r.home.x + u * 9; r.m.visible = !(t >= tAutumn);
  });
  J.stumps.forEach((s, i) => {                                      // the stumps: one is yanked out on camera, the rest go during the weeks
    const tr = i === 0 ? T('stumps.', 2) - .25 : lerpN(tRip + .5, tClear + .3, hash(i, 9));
    const u = ramp(t, tr, tr + .45);
    s.position.y = u * .9; s.rotation.z = u * .9; s.visible = u < .99 && !flat_;
  });
  if (J.stumps[0]) J.stumps[0].position.set(3.4, J.stumps[0].position.y, -2.4);
  // holes: the town digs from "Families" until the weeks are over
  const tDig = T('families'), tDigEnd = T('every') - .4;
  dyn.holes.forEach((h, i) => { const at = lerpN(tDig, tDigEnd, i / dyn.holes.length * (i < 10 ? .3 : 1)); h.grp.visible = t > at && !flat_; h.grp.scale.setScalar(.4 + .6 * ramp(t, at, at + .3)); });
  dyn.hookHole.visible = t < T('his', 2) + .1 || (t > tSpring && false);
  dyn.shovel.visible = t < T('his', 2) + .1;
  dyn.yardGround.visible = !flat_; dyn.soil.visible = flat_;
  dyn.pumpkins.visible = dyn.leaves.visible = t >= tAutumn && t < tSpring;
  dyn.sprouts.visible = t >= tSpring;
  dyn.stand.visible = t >= tAutumn && t < tSpring;
  // the sign goes up: it rises out of the ground with each hammer blow
  const hits = [T('puts') + .5, T('puts') + .85, T('sign.') + .2];
  const up = hits.reduce((a, h) => a + ramp(t, h - .06, h), 0) / 3;
  dyn.sign.position.y = -1.95 * (1 - up) * (t < T('puts') + .3 ? 1.1 : 1); dyn.sign.visible = t > T('puts') - .3 && t < tAutumn;
  dyn.sign2.position.y = -2.2 * (1 - backOut(lin(t, T('just'), T('just') + .35))); dyn.sign2.visible = t > T('just') - .05;
  dyn.sold.visible = t > tSpring;
  dyn.gate.rotation.y = -1.6 * ramp(t, T('another') - .2, T('another') + .4) * (1 - ramp(t, T('soft,'), T('soft,') + .4));
  // the golden key
  const kT = T('buried') + .1;
  dyn.key.visible = t > kT - .4 && t < T('his', 2) + .05;
  if (dyn.key.visible) {
    const u = lin(t, kT, kT + .45);
    dyn.key.position.set(lerpN(.62, 1.05, u), lerpN(1.55, .12, u * u), lerpN(1.0, .55, u)); dyn.key.rotation.set(lerpN(0, 1.4, u), t * 1.6, lerpN(.3, 1.2, u));
    if (u >= 1) { dyn.key.rotation.set(1.45, .6, 1.25); dyn.key.position.y = .1; }
  }
  dyn.keyGlow.visible = dyn.key.visible && t > T('well'); dyn.keyGlow.position.copy(dyn.key.position).add(V(0, .08, 0)); dyn.keyGlow.material.opacity = .55 + .25 * Math.sin(t * 9);
  // the tiny digger: rolls in through the gate, later pulls a stump
  const dg = dyn.digger, dIn = ramp(t, T('another') - .3, T('digger.'));
  dg.visible = t > T('another') - .2 && !flat_;
  const dp = t < tRoll ? V(.1, 0, lerpN(9.5, 2.2, dIn)) : V(lerpN(.4, 2.2, ramp(t, tRoll, tRip)), 0, lerpN(1.4, -1.3, ramp(t, tRoll, tRip)));
  dg.position.copy(dp); dg.rotation.y = t < tRoll ? Math.PI : Math.PI - .6;
  dg.boom.rotation.x = .35 + .3 * Math.sin(t * 2.2); dg.stick.rotation.x = .9 + .35 * Math.sin(t * 2.2 + 1);
  // ---- cast
  const tint = [1, 1, 1];
  const L = -1;                                              // the sun comes from the left of the usual camera
  const sh = season === 'morning' ? '#e6d8f2' : DAY, rim = season === 'autumn' ? { color: '#ffb04a', a: .35 } : season === 'morning' ? { color: '#ffb0a0', a: .3 } : { color: WARMRIM, a: .18 };
  const P = (c, x, y, z, s = 1, pitch = 0) => { c.show(); c.place(x, y, z, cam, tint, s, pitch); c.castFrom(sun.dir, true); return c; };
  const base = { lit: L, shade: sh, rim };
  const digArm = (ph) => [lerpN(30, 75, .5 + .5 * Math.sin(ph)), lerpN(20, 60, .5 + .5 * Math.sin(ph + 1))];
  let dirt = [];                                             // shovel dirt fountains this frame: [x,y,z]
  if (where === 'yard') {
    // HOOK: he grins with the key held high, then drops it into the hole
    if (t < T('his', 2) + .1) {
      const drop = t > kT;
      P(cast.him, .45, 0, .95);
      cast.him.draw({ ...base, expr: t < T('well') ? 'grin' : 'smug', look: drop ? .5 : -.25, lookY: drop ? .6 : -.1, brow: drop ? 0 : .7, blink: bl(1, T('well')),
        armR: drop ? [35, 30] : [138, -8], propR: drop ? null : 'key', armL: [24, 40], propL: 'shovel', tilt: drop ? 3 : -3 });
    }
    // the jungle: nobody in it but him, wading
    if (t > T('his', 2) + .1 && t < T('wife')) {
      P(cast.him, -1.0, 0, 1.2); cast.him.draw({ ...base, expr: 'smug', look: .3, blink: bl(1), armR: [40, 20], propR: 'shovel', armL: [20, 10] });
    }
    // the wife on the porch
    if (t > T('wife') - .2 && t < T('puts')) {
      const talk = t > A('nobody') && t < T('there."') + .3, sigh = t < A('nobody');
      P(cast.wife, -2.0, .45, -6.35);
      cast.wife.draw({ ...base, mouth: talk ? flap(env, t) : 0, expr: sigh ? 'worried' : 'smug', look: .35, lookY: sigh ? .3 : 0, gazeY: sigh ? -1 : 0, lid: sigh ? .2 : 0,
        blink: bl(2, A('nobody')), armL: [62, 118], armR: [62, 118], sweat: sigh ? ramp(t, T('sighs.'), T('sighs.') + .3) : 0, lean: sigh ? -2 : 1 });
    }
    // the sign: he hammers it in at the gate
    if (t > T('puts') - .2 && t < T('saturday,')) {
      const ph = hits.map(h => Math.max(0, 1 - Math.abs(t - h) / .18)).reduce((a, b) => Math.max(a, b), 0);
      const done = t > T('dig') - .2;
      P(cast.him, .95, 0, 5.65);
      cast.him.draw({ ...base, expr: done ? 'proud' : 'focused', look: done ? -.6 : .8, lookY: done ? 0 : .2, blink: bl(1, T('dig') - .2), armR: done ? [150, -10] : [lerpN(150, 95, ph), lerpN(-30, -10, ph)], propR: done ? null : 'hammer', armL: done ? [24, 30] : [60, 50], tilt: done ? -2 : 2 });
    }
    // the queue: along the pavement, round the corner and out of the picture
    if (t > T('saturday,') - .1 && t < T('families')) {
      dyn.queue.forEach((e, i) => { const x = -1.2 - i * .78, z = 6.25 + (i % 2) * .18; e.place(x, .1, z, i % 5 === 2 ? .62 : 1); });
      for (const k of ['dad', 'mom', 'kid1', 'detect', 'pull1', 'pull2', 'kid2', 'crew1', 'crew2', 'crew3', 'driver', 'farmer'])
        cast[k].draw({ ...base, expr: 'smile', look: .7, blink: bl(k.length), armR: k === 'detect' ? [30, 20] : [14, 30], propR: k === 'detect' ? 'detector' : k.startsWith('kid') ? 'bucket' : 'shovel', armL: [16, 10] });
      P(cast.him, .3, .1, 5.7); cast.him.draw({ ...base, expr: 'grin', look: -.7, blink: bl(1), armR: [110, -20], propR: null, armL: [20, 30] });
    }
    // families with shovels, kids with buckets
    if (t > T('families') - .2 && t < T('metal') - .6) {
      const kids = t > A('kids');
      P(cast.dad, -3.1, 0, -1.1); cast.dad.draw({ ...base, expr: 'focused', look: .4, lookY: .6, blink: bl(3), armR: digArm(t * 7), propR: 'shovel', armL: digArm(t * 7 + .4), lean: 4 + 3 * Math.sin(t * 7) });
      P(cast.mom, -1.8, 0, -.7); cast.mom.draw({ ...base, expr: 'smile', look: -.4, lookY: .5, blink: bl(4), armL: digArm(t * 6 + 2), propL: 'shovel', armR: digArm(t * 6 + 2.4), lean: -3 - 3 * Math.sin(t * 6 + 2) });
      P(cast.kid1, -2.7, 0, .45); cast.kid1.draw({ ...base, expr: kids ? 'grin' : 'smile', look: .5, blink: bl(5, A('kids')), armR: [kids ? 40 + 20 * Math.sin(t * 9) : 20, 20], propR: 'bucket', propColor: '#3a8ad8', armL: [30, 20], bob: kids ? -Math.abs(Math.sin(t * 9)) * 14 : 0 });
      P(cast.kid2, -1.35, 0, .7); cast.kid2.draw({ ...base, expr: kids ? 'laugh' : 'smile', look: -.5, blink: bl(6, A('kids')), armL: [kids ? 60 : 20, 30], propL: 'bucket', propColor: '#e8503a', armR: [30, 20], bob: kids ? -Math.abs(Math.sin(t * 8 + 1)) * 14 : 0 });
      dirt.push([-2.6, .2, -1.0], [-1.6, .2, -.6]);
    }
    // the man with the metal detector
    if (t > T('metal') - .6 && t < T('another') + .3) {
      const beep = t > T('detector.');
      P(cast.detect, 2.9, 0, -.6); cast.detect.draw({ ...base, expr: beep ? 'surprised' : 'focused', look: -.3 + .4 * Math.sin(t * 3), lookY: beep ? 0 : .7, blink: bl(7, T('detector.')), armR: [30 + 12 * Math.sin(t * 3), 20], propR: 'detector', armL: [40, 50], lean: 3 * Math.sin(t * 3) });
      P(cast.dad, -.6, 0, -2.4); cast.dad.draw({ ...base, expr: 'focused', look: .4, lookY: .6, blink: bl(3), armR: digArm(t * 7), propR: 'shovel', armL: digArm(t * 7 + .4), lean: 4 + 3 * Math.sin(t * 7) });
    }
    // the tiny digger rolls in, its driver grinning; the crowd keeps digging
    if (t > T('another') - .2 && t < T('people') + .1) {
      dg.updateMatrixWorld(true); const seat = dg.localToWorld(dg.seat.clone());
      P(cast.driver, seat.x, seat.y - .55, seat.z, .62); cast.driver.draw({ ...base, expr: 'grin', look: .3, blink: bl(8), armR: [60, 60], armL: [60, 60] });
      P(cast.detect, 2.6, 0, -.9); cast.detect.draw({ ...base, expr: 'surprised', look: -.6, blink: bl(7), armR: [30, 20], propR: 'detector', armL: [40, 50] });
    }
    // pulling the weeds out
    if (t > T('people') - .2 && t < T('roll') - .5) {
      const tug = Math.sin(t * 10);
      P(cast.pull1, -4.0, 0, -1.6); cast.pull1.draw({ ...base, expr: 'angry', look: .6, lookY: .4, blink: bl(9), armR: [70 + tug * 8, 20], armL: [75 + tug * 8, 20], lean: -8 - 4 * tug });
      P(cast.pull2, -5.0, 0, -.4); cast.pull2.draw({ ...base, expr: 'focused', look: .5, lookY: .5, blink: bl(10), armR: [80 - tug * 8, 10], armL: [70 - tug * 8, 20], lean: -10 + 4 * tug });
      P(cast.kid1, -5.2, 0, -2.2); cast.kid1.draw({ ...base, expr: 'laugh', look: -.3, blink: bl(5), armR: [150, -10], armL: [150, -10], bob: -Math.abs(Math.sin(t * 9)) * 14 });
    }
    // rolling rocks, ripping stumps
    if (t > T('roll') - .5 && t < T('weeks') + .1) {
      P(cast.pull1, 3.0, 0, -3.4); cast.pull1.draw({ ...base, expr: 'focused', look: .6, lookY: .4, blink: bl(9), armR: [80, 20], armL: [80, 20], lean: 10 });
      P(cast.mom, 1.0, 0, -1.6); cast.mom.draw({ ...base, expr: 'grin', look: .5, blink: bl(4), armR: [70, 30], armL: [70, 30], lean: 8 });
      P(cast.driver, dg.position.x - .1, .3, dg.position.z, .62); cast.driver.draw({ ...base, expr: 'grin', look: .5, blink: bl(8), armR: [60, 60], armL: [60, 60] });
      dg.updateMatrixWorld(true); { const seat = dg.localToWorld(dg.seat.clone()); cast.driver.place(seat.x, seat.y - .55, seat.z, cam, tint, .62); }
    }
    // weeks go by: tired diggers everywhere, nobody finds anything
    if (t > T('weeks') - .1 && t < T('every') - .3) {
      const sp = [[-3.5, -2], [-1.2, -3.4], [1.5, -1.0], [3.6, -2.8], [-4.4, 1.6], [2.4, 2.0], [0, .6]];
      const who = ['dad', 'mom', 'detect', 'pull1', 'pull2', 'kid1', 'crew1'];
      const lost = t > A('nobody', 2);
      sp.forEach(([x, z], i) => { P(cast[who[i]], x, 0, z); cast[who[i]].draw({ ...base, expr: lost ? 'worried' : 'focused', look: (i % 2 ? .5 : -.5), lookY: lost ? -.2 : .7, blink: bl(i + 3, A('nobody', 2)), armR: lost ? [20, 10] : digArm(t * 8 + i), propR: who[i] === 'detect' ? 'detector' : who[i] === 'kid1' ? 'bucket' : 'shovel', armL: [20, 10], sweat: lost ? 1 : 0 }); dirt.push([x + .3, .2, z]); });
    }
    // every morning they pay again: coins into his jar at the gate
    if (t > T('every') - .4 && t < T('you')) {
      const pay = (t - T('every')) % .7 < .35;
      P(cast.him, 0, 0, 4.85); cast.him.draw({ ...base, expr: 'smug', look: -.5, blink: bl(1), armR: [50, 70], propR: 'jar', jar: lerpN(.15, .6, lin(t, T('every'), T('you'))), armL: [20, 10] });
      P(cast.pull2, -.75, .1, 5.85); cast.pull2.draw({ ...base, expr: 'worried', look: .7, blink: bl(10), armR: [pay ? 80 : 50, pay ? 10 : 40], propR: 'coin', armL: [20, 10], propL: 'shovel' });
      dyn.queue.slice(0, 8).forEach((e, i) => e.place(-1.6 - i * .75, .1, 6.2 + (i % 2) * .15));
      for (const k of ['dad', 'mom', 'kid1', 'detect', 'pull1', 'kid2', 'crew1', 'crew2']) cast[k].draw({ ...base, expr: 'worried', look: -.7, blink: bl(k.length), armR: [14, 30], propR: k.startsWith('kid') ? 'bucket' : 'shovel', armL: [16, 10] });
    }
    // "He got all of it done for free. And the crew paid him."
    if (t > T('got') - .3 && t < T('when')) {
      const paid = t > A('paid');
      P(cast.him, 0, 0, 4.85); cast.him.draw({ ...base, expr: paid ? 'grin' : 'smug', look: paid ? -.2 : .3, lookY: paid ? 0 : .4, blink: bl(1, A('paid')), lid: !paid && Math.sin(t * 2) > .9 ? .6 : 0, armR: [56, 74], propR: 'jar', jar: paid ? .95 : .7, armL: paid ? [150, -20] : [40, 60], propL: paid ? 'coin' : null });
    }
    // the last digger gives up
    if (t > T('when') - .2 && t < T('plants')) {
      const go = lin(t, T('when'), T('soft,') + .2);
      P(cast.dad, lerpN(-.3, .1, go), 0, lerpN(2.0, 6.6, go)); cast.dad.draw({ ...base, expr: 'worried', look: .2, blink: bl(3), armR: [20, 10], propR: 'shoulder', armL: [12, 8], bob: -Math.abs(Math.sin(t * 8)) * 8, lean: -2 });
      P(cast.him, -2.5, 0, -3.0); cast.him.draw({ ...base, expr: 'smug', look: .3, blink: bl(1), armR: [24, 50], armL: [24, 50] });
    }
    // seeds
    if (t > T('plants') - .2 && t < T('autumn,')) {
      P(cast.him, -.9, 0, -.15); cast.him.draw({ ...base, expr: 'proud', look: .6, lookY: .6, blink: bl(1), armR: [95, 10], propR: 'seedbag', pour: true, armL: [30, 30], lean: 3 });
    }
    // autumn: the pumpkin patch, him in the middle of it
    if (t > T('autumn,') - .2 && t < T('who')) {
      P(cast.him, -.4, 0, .3); cast.him.draw({ ...base, expr: 'proud', look: -.4, blink: bl(1), armR: [150, -20], armL: [40, 70], propL: 'pumpkin' });
    }
    // the same diggers buy the pumpkins
    if (t > T('who') - .2 && t < T('next') - .1) {
      const same = t > A('same');
      P(cast.him, -2.8, 0, 5.45); cast.him.draw({ ...base, expr: same ? 'smug' : 'grin', look: .4, blink: bl(1, A('same')), armR: [60, 60], propR: 'coin', armL: [40, 70], propL: 'jar', jar: .9 });
      const q = ['dad', 'mom', 'kid1', 'detect', 'pull1', 'pull2'];
      q.forEach((k, i) => { P(cast[k], -1.6 + i * .75, .1, 6.8 + (i % 2) * .15); cast[k].draw({ ...base, expr: i === 0 ? 'worried' : 'neutral', look: -.6, blink: bl(i + 3), armL: [i === 0 ? 70 : 20, 30], propL: i === 0 ? 'coin' : (i === 2 ? 'pumpkin' : null), armR: [20, 10] }); });
    }
    // spring: a new golden key
    if (t > T('next') - .2 && t < T('field') - .7) {
      P(cast.him, .55, 0, .4); cast.him.draw({ ...base, expr: 'grin', look: -.25, lookY: -.1, brow: .8, blink: bl(1), armR: [158, -18], propR: 'key', armL: [24, 40] });
    }
    // the field next door: SOLD. He hammers in his new sign
    if (t > T('field') - .8) {
      const done = t > T('just') + .3;
      P(cast.him, 11.0, 0, 4.1); cast.him.draw({ ...base, expr: done ? 'smug' : 'proud', look: done ? -.5 : .6, blink: bl(1, T('just') + .3), lid: done ? .15 : 0, armR: done ? [40, 60] : [lerpN(150, 100, Math.max(0, Math.sin((t - T('just')) * 18))), -20], propR: done ? null : 'hammer', armL: [24, 30] });
    }
  } else {
    // FARM: a farmer pays a whole crew to clear his field
    const pays = t > A('farmers');
    P(cast.farmer, 299.7, 0, 1.0); cast.farmer.draw({ lit: -1, shade: DAY, rim, expr: pays ? 'worried' : 'surprised', look: .5, lookY: pays ? 0 : -.6, blink: bl(11, A('farmers')), sweat: pays ? 1 : 0, armR: pays ? [70, 20] : [20, 10], propR: pays ? 'coin' : null, armL: [24, 30] });
    const work = t > A('crews');
    P(cast.crew1, 300.6, 0, -.6); cast.crew1.draw({ lit: -1, shade: DAY, rim, expr: 'focused', look: .4, lookY: .6, blink: bl(12), armR: work ? digArm(t * 8) : [20, 10], propR: 'shovel', armL: work ? digArm(t * 8 + .4) : [20, 10], lean: work ? 5 + 3 * Math.sin(t * 8) : 0 });
    P(cast.crew2, 302.0, 0, -1.6); cast.crew2.draw({ lit: -1, shade: DAY, rim, expr: 'angry', look: -.3, lookY: .4, blink: bl(13), armR: work ? [75 + 8 * Math.sin(t * 10), 20] : [20, 10], armL: work ? [80 + 8 * Math.sin(t * 10), 20] : [20, 10], lean: work ? -8 : 0 });
    P(cast.crew3, 303.3, 0, -.4); cast.crew3.draw({ lit: -1, shade: DAY, rim, expr: 'focused', look: -.5, lookY: .5, blink: bl(14), armR: work ? digArm(t * 7 + 1) : [20, 10], propR: 'shovel', armL: [30, 20] });
    if (work) dirt.push([301.0, .2, -.5], [303.6, .2, -.3]);
    const tagIn = backOut(lin(t, T('fortune.') - .1, T('fortune.') + .25));
    dyn.tag.scale.setScalar(Math.max(.001, tagIn * (1 + .15 * ramp(t, T('crews'), T('soil.') + .2))));
    dyn.tag.rotation.z = .25 * Math.sin(t * 3.1) * Math.exp(-Math.max(0, t - T('fortune.')) * .4) + .05 * Math.sin(t * 2);
    dyn.F.inst.forEach(m => m.instanceMatrix.needsUpdate = false);
  }
  // dirt flying off the shovels, seeds falling from the bag, the key's sparkle
  dyn.dirt.wisps.length = 0;
  dirt.forEach((p, i) => dyn.dirt.wisps.push({ n: 14, size: .06, alpha: .9, speed: 1.3, seed: i,
    path: (u, tt, k) => [p[0] + (hash(k, i) - .5) * .5 * u, p[1] + Math.sin(u * Math.PI) * .7, p[2] + (hash(k, i + 3) - .5) * .4 * u] }));
  dyn.dirt.update(t);
  dyn.seeds.wisps.length = 0;
  if (where === 'yard' && t > T('plants') && t < T('autumn,') - .2) { const h = cast.him.hand(1, 30, 60); if (h) dyn.seeds.wisps.push({ n: 40, size: .03, alpha: 1, speed: 1.2, path: (u, tt, k) => [h.x + (hash(k) - .5) * .12, h.y - u * h.y, h.z + (hash(k, 2) - .5) * .12] }); }
  dyn.seeds.update(t);
  dyn.sparkle.wisps.length = 0;
  if (dyn.key.visible && t > T('well') - .1) dyn.sparkle.wisps.push({ n: 24, size: .035, alpha: .9, speed: .5, path: (u, tt, k) => { const a = hash(k) * 6.28; return [dyn.key.position.x + Math.cos(a) * .2 * u, dyn.key.position.y + .1 + u * .25, dyn.key.position.z + Math.sin(a) * .2 * u]; } });
  dyn.sparkle.update(t);
  // pop-ups for the overlay (screen space)
  dyn.pops = [];
  const pop = (t0, t1, text, opts = {}) => { if (t >= t0 && t < t1) dyn.pops.push({ age: t - t0, left: t1 - t, text, ...opts }); };
  pop(T('worth') - .05, T('his', 2), '$10,000', { color: '#3fb85a', ink: '#14401e' });
  pop(T('five') - .05, T('saturday,'), '$5', { color: '#3fb85a', ink: '#14401e' });
  pop(T('saturday,') + .05, T('families') - .1, 'SATURDAY', { color: '#ffffff', ink: '#2a1a5c', size: 120 });
  pop(T('fortune.') - .1, T('farmers'), 'A FORTUNE', { color: '#ffd23a', ink: '#5a2a0a', size: 120 });
  pop(T('free.') - .05, T('paid') - .1, 'FREE', { color: '#3fb85a', ink: '#14401e', size: 150 });
  pop(T('autumn,') + .05, T('who') - .1, 'AUTUMN', { color: '#ffb04a', ink: '#5a2a0a', size: 130 });
  const worldPop = (t0, t1, text, p) => { if (t >= t0 && t < t1) { const s = p.clone().project(cam); dyn.pops.push({ age: t - t0, left: t1 - t, text, x: (s.x + 1) / 2, y: (1 - s.y) / 2, color: '#ffffff', ink: PLUM, size: 150, small: true }); } };
  worldPop(T('detector.') - .05, T('another'), '!', V(2.9, 2.15, -.6));
  worldPop(T('nobody', 2) + .1, T('every') - .4, '?', V(1.5, 2.2, -1.0));
  // ---- look (lens, grade) per shot
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (where === 'farm') look = { ...focusOn(V(300.8, 1.2, -.5), 4, 6) };
  else if (t < T('buried') - .3) look = focusOn(V(.45, 1.4, .95), 7, 2.0);
  else if (t < T('backyard.') - .1) look = focusOn(V(1.05, .2, .55), 8, 1.2);
  else if (t >= T('well') && t < T('his', 2) + .05) look = focusOn(V(1.05, .1, .55), 9, .7);
  else if (t > T('wife') && t < T('puts')) look = focusOn(V(-2.0, 1.4, -6.35), 7, 2.5);
  else if (t > T('puts') && t < T('saturday,')) look = focusOn(t > T('dig') ? V(1.9, 1.45, 5.2) : V(1.0, 1.3, 5.6), 6, 2.5);
  else if (t > T('families') && t < T('roll')) look = focusOn(V(-2, 1, -.5), 4, 4);
  else if (t > T('every') - .3 && t < T('you')) look = focusOn(V(0, 1.3, 5), 5, 2.5);
  else if (t > T('got') && t < T('when')) look = focusOn(V(0, 1.45, 4.85), 7, 1.8);
  else if (t > T('plants') && t < T('autumn,')) look = focusOn(V(-.9, .8, -.15), 5, 2);
  else if (t > T('who') && t < T('next') - .1) look = focusOn(V(-2.7, 1.1, 6), 5, 3);
  else if (t > T('next') && t < T('field') - .7) look = focusOn(V(.55, 1.5, .4), 7, 2);
  else look = { focus: 10, coc: 0, range: 10 };
  const grade = season === 'autumn' ? { sat: 1.15, lift: [.1, .08, .14], tint: [1.04, 1.0, .94] } : season === 'morning' ? { sat: 1.1, lift: [.11, .09, .15], tint: [1.03, .98, 1.0] } : { sat: 1.12, lift: [.095, .09, .15], tint: [1, 1, 1.02] };
  Object.assign(look, grade, { bloom: .7, vignette: .18 });
  look.blur = cp.moving > .15 ? 16 : 0;
  return look;
}

// stat cards and pop-ups, drawn over the frame (never over the captions at 70 %)
export function overlay(g, t, ctx) {
  const { W: w, H: h } = ctx;
  for (const p of dyn.pops || []) {
    const k = backOut(Math.min(1, p.age / .2)) * Math.min(1, p.left / .12);
    if (k <= 0) continue;
    const s = (p.size || 150) * w / 1080 * k;
    g.save(); g.translate((p.x ?? .5) * w, (p.y ?? .2) * h); g.rotate(p.small ? 0 : -.05);
    g.font = `900 ${s}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (!p.small) {
      const tw = g.measureText(p.text).width + s * .7, th = s * 1.3;
      g.fillStyle = '#fff8e6'; g.strokeStyle = PLUM; g.lineWidth = s * .09;
      g.beginPath(); g.roundRect(-tw / 2, -th / 2, tw, th, s * .3); g.fill(); g.stroke();
    }
    g.strokeStyle = p.ink; g.lineWidth = s * .16; g.strokeText(p.text, 0, s * .04); g.fillStyle = p.color; g.fillText(p.text, 0, s * .04);
    g.restore();
  }
}
