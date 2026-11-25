// Why He Ate at the Worst Restaurant Every Day — fiction, double twist. He eats at the worst diner in town every day;
// he owns it, and the best restaurant across the street; the dump makes the fancy place look worth fifty a plate.
// Then a food critic walks into the dump by mistake.
// Sets: STREET (x≈0: the WORST DINER inside and out, the GOLDEN SPOON across the street)
//       KITCHEN (x≈200: the diner's kitchen at night)   DIAGRAM (x≈300: the seesaw)
// Light tells the story: the dump is lit by one flickering cool-green tube (sickly), the fancy place glows warm gold;
// a low golden-hour sun runs down the street between them (warm key, real shadows) against a cool sky.
// Every cue is pinned to a word of voice/words.json (W('word', n) = start of the n-th match; English repeats many
// small words, so most pins carry n).
import * as THREE from 'three';
import { woodTex, painted, flat, rng, D, shade } from '/engine/src/paint.js';
import { Toon, PLUM, flap, blinkAt } from '/engine/src/toon.js';
import { CamPath, smoother } from '/engine/src/camera.js';
import { Smoke, glow } from '/engine/src/fx.js';

export const NAME = 'worst-diner';
export const FPS = 30;
export let DUR = 55.3;
export const CUES = [];
export const SCORE = 'folk';

const S = smoother;
const ramp = (t, a, b) => S((t - a) / (b - a));
const lin = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const lerpN = (a, b, k) => a + (b - a) * k;
const V = (...a) => new THREE.Vector3(...a);
const HDR = (r, g, b) => new THREE.Color().setRGB(r, g, b);
const backOut = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;
const hash = (i, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
const FONT = '"Inter", "Segoe UI Black", "Arial Black", sans-serif';
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
    if (/Box|Cylinder|Extrude|Lathe|Torus|Sphere/.test(o.geometry.type) && !o.userData.noShadow) o.castShadow = true;
  });
}
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function ctex(c, rep = [1, 1]) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t; }

// ---------------------------------------------------------------- textures
function brickTex({ base = '#b8644a', rep = [1, 1] } = {}) {
  const [c, g] = cv(512, 512), R = rng(3); g.fillStyle = shade(base, .62); g.fillRect(0, 0, 512, 512);
  for (let y = 0, r = 0; y < 512; y += 32, r++) for (let x = (r % 2) * 32 - 64; x < 512; x += 64) {
    g.fillStyle = shade(base, .88 + R() * .24); g.fillRect(x + 2, y + 2, 60, 28);
    g.fillStyle = shade(base, 1.15); g.globalAlpha = .5; g.fillRect(x + 2, y + 2, 60, 4); g.globalAlpha = 1;
  }
  return ctex(c, rep);
}
function plasterTex({ base = '#9ec4b0', stains = 0, rep = [1, 1], seed = 5 } = {}) {
  const [c, g] = cv(512, 512), R = rng(seed); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 300; i++) { g.fillStyle = shade(base, .9 + R() * .2); g.globalAlpha = .4; g.beginPath(); g.ellipse(R() * 512, R() * 512, 20 + R() * 40, 10 + R() * 20, R() * 3, 0, 6.29); g.fill(); }
  for (let i = 0; i < stains; i++) {                                   // grime: drips, a crack, a peeled patch
    const x = R() * 512, y = R() * 300; g.globalAlpha = .45; g.fillStyle = shade(base, .7);
    g.beginPath(); g.ellipse(x, y, 20 + R() * 30, 14 + R() * 18, 0, 0, 6.29); g.fill(); g.fillRect(x - 3, y, 6, 60 + R() * 80);
    g.globalAlpha = .8; g.strokeStyle = shade(base, .55); g.lineWidth = 2.5; let px = R() * 512, py = R() * 512; g.beginPath(); g.moveTo(px, py);
    for (let k = 0; k < 5; k++) { px += (R() - .5) * 40; py += 14 + R() * 20; g.lineTo(px, py); } g.stroke();
    g.globalAlpha = .9; g.fillStyle = shade(base, 1.18); g.strokeStyle = shade(base, .6); g.lineWidth = 2;
    const qx = R() * 512, qy = R() * 512; g.beginPath(); g.moveTo(qx, qy); g.lineTo(qx + 30, qy + 6); g.lineTo(qx + 22, qy + 34); g.lineTo(qx - 4, qy + 26); g.closePath(); g.fill(); g.stroke();
  }
  g.globalAlpha = 1; return ctex(c, rep);
}
function stoneFacadeTex({ base = '#efe2c4', rep = [1, 1] } = {}) {
  const [c, g] = cv(512, 512), R = rng(7); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0, r = 0; y < 512; y += 64, r++) for (let x = (r % 2) * 64 - 128; x < 512; x += 128) {
    g.fillStyle = shade(base, .94 + R() * .1); g.fillRect(x + 2, y + 2, 124, 60);
    g.fillStyle = shade(base, 1.08); g.fillRect(x + 4, y + 4, 120, 4);
  }
  g.fillStyle = shade(base, .7); for (let y = 0; y < 512; y += 64) g.fillRect(0, y - 1, 512, 3);
  return ctex(c, rep);
}
function checkerTex({ a = '#d8d4c0', b = '#5a6a7a', grime = .4, rep = [1, 1] } = {}) {
  const [c, g] = cv(512, 512), R = rng(9);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? b : a; g.fillRect(x * 64, y * 64, 64, 64); }
  g.globalAlpha = grime; for (let i = 0; i < 90; i++) { g.fillStyle = shade('#6a6a4a', .8 + R() * .3); g.beginPath(); g.ellipse(R() * 512, R() * 512, 10 + R() * 30, 6 + R() * 16, R() * 3, 0, 6.29); g.fill(); }
  g.globalAlpha = 1; g.strokeStyle = 'rgba(40,40,50,.5)'; g.lineWidth = 2; for (let k = 0; k <= 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
  return ctex(c, rep);
}
function subwayTex({ base = '#eef2f4', rep = [1, 1] } = {}) {
  const [c, g] = cv(512, 512); g.fillStyle = shade(base, .7); g.fillRect(0, 0, 512, 512);
  for (let y = 0, r = 0; y < 512; y += 32, r++) for (let x = (r % 2) * 32 - 64; x < 512; x += 64) {
    g.fillStyle = base; g.beginPath(); g.roundRect(x + 2, y + 2, 60, 28, 5); g.fill();
    g.fillStyle = '#ffffff'; g.globalAlpha = .6; g.fillRect(x + 6, y + 5, 30, 4); g.globalAlpha = 1;
  }
  return ctex(c, rep);
}
function pavingTex({ base = '#c9c4d6', rep = [1, 1] } = {}) {
  const [c, g] = cv(512, 512), R = rng(8); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 128) { g.fillStyle = shade(base, .94 + R() * .1); g.fillRect(x, 0, 128, 512); }
  g.fillStyle = shade(base, .66); for (let x = 0; x <= 512; x += 128) g.fillRect(x - 2, 0, 4, 512);
  return ctex(c, rep);
}
function roadTex() {
  const [c, g] = cv(512, 512), R = rng(9), base = '#6a6e8c'; g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 500; i++) { g.fillStyle = shade(base, .85 + R() * .3); g.globalAlpha = .45; g.beginPath(); g.arc(R() * 512, R() * 512, 2 + R() * 6, 0, 6.29); g.fill(); }
  g.globalAlpha = 1; g.fillStyle = '#f2d060'; for (let x = 0; x < 512; x += 128) g.fillRect(x + 16, 250, 72, 12);
  return ctex(c, [8, 1]);
}
function skyTex(top, mid, low) {
  const [c, g] = cv(64, 512); const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, D(top)); gr.addColorStop(.38, D(mid)); gr.addColorStop(.5, D(low)); gr.addColorStop(1, D(low));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 512); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// the egg-head owner, drawn as a portrait (on the OWNER side of the diner's sign and on the Golden Spoon's medallion)
function portrait(g, cx, cy, r, frame = '#f2c23a') {
  g.save(); g.translate(cx, cy);
  g.fillStyle = frame; g.strokeStyle = PLUM; g.lineWidth = r * .08; g.beginPath(); g.arc(0, 0, r, 0, 6.29); g.fill(); g.stroke();
  g.fillStyle = '#fff6e0'; g.beginPath(); g.arc(0, 0, r * .84, 0, 6.29); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, r * .84, 0, 6.29); g.clip();
  g.fillStyle = '#7a5aa8'; g.beginPath(); g.ellipse(0, r * .95, r * .55, r * .4, 0, 0, 6.29); g.fill(); g.stroke();
  g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, r * .15, r * .48, r * .44, 0, 0, 6.29); g.fill(); g.lineWidth = r * .05; g.stroke();
  g.fillStyle = '#4a3a5a'; g.beginPath(); g.ellipse(0, -r * .22, r * .52, r * .07, 0, 0, 6.29); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-r * .34, -r * .22); g.bezierCurveTo(-r * .36, -r * .7, r * .36, -r * .7, r * .34, -r * .22); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = PLUM; for (const s of [-1, 1]) { g.save(); g.beginPath(); g.rect(s * r * .14 - r * .08, r * .06, r * .16, r * .2); g.clip(); g.beginPath(); g.ellipse(s * r * .14, r * .06, r * .06, r * .09, 0, 0, 6.29); g.fill(); g.restore();
    g.lineWidth = r * .04; g.beginPath(); g.moveTo(s * r * .14 - r * .08, r * .06); g.lineTo(s * r * .14 + r * .08, r * .06); g.stroke(); }
  g.fillStyle = '#4a3a5a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * r * .1, r * .3, r * .12, r * .05, s * .3, 0, 6.29); g.fill(); }
  g.strokeStyle = PLUM; g.lineWidth = r * .04; g.beginPath(); g.moveTo(-r * .12, r * .4); g.quadraticCurveTo(0, r * .46, r * .14, r * .37); g.stroke();
  g.restore(); g.restore();
}
function signTex(draw, w = 1024, h = 320) { const [c, g] = cv(w, h); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function lettering(g, text, x, y, size, fill, stroke) { g.font = `900 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; if (stroke) { g.strokeStyle = stroke; g.lineWidth = size * .16; g.strokeText(text, x, y); } g.fillStyle = fill; g.fillText(text, x, y); }
// the fancy room seen through the Golden Spoon's windows: painted, unlit, warm (it blooms)
function fancyInsideTex() {
  const [c, g] = cv(512, 512); const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, D('#ffd890')); gr.addColorStop(1, D('#e8a050'));
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = D('#fff2c8'); for (const x of [90, 256, 422]) { g.beginPath(); g.arc(x, 60, 26, 0, 6.29); g.fill(); }        // chandeliers
  for (const [x, y, s] of [[120, 360, 1], [380, 360, 1], [250, 300, .7]]) {
    g.fillStyle = D('#ffffff'); g.strokeStyle = D('#c8925a'); g.lineWidth = 4;
    g.beginPath(); g.moveTo(x - 90 * s, y); g.lineTo(x + 90 * s, y); g.lineTo(x + 100 * s, y + 80 * s); g.lineTo(x - 100 * s, y + 80 * s); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = D('#c8323a'); g.beginPath(); g.arc(x, y - 18 * s, 12 * s, 0, 6.29); g.fill();
    g.fillStyle = D('#8a4a6a'); for (const s2 of [-1, 1]) { g.beginPath(); g.arc(x + s2 * 120 * s, y - 70 * s, 26 * s, 0, 6.29); g.fill(); g.fillRect(x + s2 * 120 * s - 30 * s, y - 50 * s, 60 * s, 90 * s); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function newspaperTex() {
  const [c, g] = cv(800, 1100); g.fillStyle = D('#f4efe0'); g.fillRect(0, 0, 800, 1100);
  g.strokeStyle = D('#3a3040'); g.lineWidth = 6; g.strokeRect(20, 20, 760, 1060);
  lettering(g, 'THE DAILY TOWN', 400, 90, 72, D('#2a2236'));
  g.fillStyle = D('#2a2236'); g.fillRect(40, 140, 720, 6); g.fillRect(40, 152, 720, 2);
  lettering(g, 'SO BAD,', 400, 240, 120, D('#c8323a'), D('#2a2236'));
  lettering(g, "IT'S GENIUS", 400, 370, 110, D('#c8323a'), D('#2a2236'));
  lettering(g, '★★★★★', 400, 480, 90, D('#f2b62a'), D('#6a4a10'));
  g.fillStyle = D('#9ec4b0'); g.fillRect(70, 560, 340, 300); g.strokeRect(70, 560, 340, 300);              // a photo of the dump
  g.fillStyle = D('#5a7a6a'); g.fillRect(110, 680, 140, 110); g.fillStyle = D('#d8d0a0'); g.fillRect(100, 600, 280, 50); lettering(g, 'WORST DINER', 240, 626, 34, D('#4a5a4a'));
  g.fillStyle = D('#8a8aa0'); for (let k = 0; k < 14; k++) g.fillRect(440, 570 + k * 22, k % 4 === 3 ? 180 : 300, 9);
  for (let k = 0; k < 7; k++) g.fillRect(70, 890 + k * 22, k % 3 === 2 ? 400 : 660, 9);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const box = (g, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };

// ---------------------------------------------------------------- STREET (x = 0)
const DZ = -5.2, FZ = 5.4;               // the diner's front wall, the Golden Spoon's front wall
const TABLE = V(-2.0, .74, -6.1);
function buildStreet(scene) {
  const g = new THREE.Group(); scene.add(g); dyn.street = g;
  // sky (golden hour) — scene level, so every set has it
  const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 48, 24), new THREE.MeshBasicMaterial({ map: skyTex('#4a6ad8', '#f0a890', '#ffd8a0'), side: THREE.BackSide, depthWrite: false }));
  sky.renderOrder = -10; scene.add(sky); dyn.sky = sky;
  dyn.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({ color: HDR(3.2, 2.4, 1.3) })); dyn.sunDisc.layers.set(1); scene.add(dyn.sunDisc);
  // street
  const road = new THREE.Mesh(new THREE.PlaneGeometry(140, 6.4), painted(roadTex())); road.material.map.repeat.set(35, 1); road.rotation.x = -Math.PI / 2; road.position.y = .01; g.add(road);
  for (const z of [-4.2, 4.3]) { box(g, 140, .12, 2.2, 0, .06, z, painted(pavingTex({ rep: [70, 1] }))); }
  for (const z of [-3.12, 3.12]) box(g, 140, .14, .14, 0, .07, z, flat('#e2deea'));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), flat('#8a8aa0')); back.rotation.x = -Math.PI / 2; back.position.y = -.01; g.add(back);
  // ---- the WORST DINER: front wall built round a big window and a door
  const ext = painted(plasterTex({ base: '#9ec4b0', stains: 7, rep: [2, 1] })), trim = flat('#e8e0c8');
  const Y0 = .85, Y1 = 2.55, WX = [-4.4, .4], DX = [2.0, 3.2], H = 3.7, T = .2;
  box(g, 1.6, H, T, -5.2, H / 2, DZ, ext); box(g, WX[1] - WX[0], Y0, T, (WX[0] + WX[1]) / 2, Y0 / 2, DZ, ext); box(g, WX[1] - WX[0], H - Y1, T, (WX[0] + WX[1]) / 2, (H + Y1) / 2, DZ, ext);
  box(g, DX[0] - WX[1], H, T, (WX[1] + DX[0]) / 2, H / 2, DZ, ext); box(g, DX[1] - DX[0], H - 2.3, T, (DX[0] + DX[1]) / 2, (H + 2.3) / 2, DZ, ext); box(g, 6 - DX[1], H, T, (DX[1] + 6) / 2, H / 2, DZ, ext);
  box(g, WX[1] - WX[0] + .2, .12, .3, (WX[0] + WX[1]) / 2, Y0, DZ + .05, trim); box(g, WX[1] - WX[0] + .2, .1, .26, (WX[0] + WX[1]) / 2, Y1, DZ + .05, trim);
  for (const x of WX) box(g, .1, Y1 - Y0, .26, x, (Y0 + Y1) / 2, DZ + .05, trim);
  box(g, .06, Y1 - Y0, .1, -2.0, (Y0 + Y1) / 2, DZ, trim); box(g, 12.2, .18, .4, 0, H, DZ + .05, trim);
  // a crooked blind, half down, in the window
  const blind = box(g, 2.2, .5, .03, -3.2, Y1 - .3, DZ - .08, flat('#d8d0a8')); blind.rotation.z = .08;
  // the door (it swings open for the cook and the critic)
  const door = new THREE.Group(); door.position.set(DX[0], 0, DZ); g.add(door); dyn.door = door;
  const dl = box(door, DX[1] - DX[0], 2.3, .06, (DX[1] - DX[0]) / 2, 1.15, 0, flat('#c8a060')); const dw = new THREE.Mesh(new THREE.CircleGeometry(.22, 20), new THREE.MeshBasicMaterial({ color: '#b8d0c8' })); dw.position.set(.6, 1.6, .04); door.add(dw);
  box(door, .14, .05, .08, 1.05, 1.1, .06, flat('#d8d0c0'));
  // the hanging sign: WORST DINER on the front, OWNER + his face on the back. It spins on its chains for the reveal.
  const front = signTex((c, w, h) => { c.fillStyle = '#e8dcae'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5a6a5a'; c.lineWidth = 18; c.strokeRect(9, 9, w - 18, h - 18);
    lettering(c, 'WORST', w / 2, h * .32, 120, '#4a6a5a'); lettering(c, 'DINER', w / 2, h * .72, 130, '#c86a3a');
    c.strokeStyle = '#4a4a4a'; c.lineWidth = 6; c.beginPath(); c.moveTo(w * .72, 0); c.lineTo(w * .66, h * .4); c.lineTo(w * .74, h * .6); c.lineTo(w * .7, h); c.stroke(); });
  const backT = signTex((c, w, h) => { c.fillStyle = '#f6e6b8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c8962a'; c.lineWidth = 18; c.strokeRect(9, 9, w - 18, h - 18);
    portrait(c, w * .2, h / 2, h * .38); lettering(c, 'OWNER', w * .62, h / 2, 150, '#c8323a', '#5a1a1a'); });
  const sgM = flat('#d8c890'); const sign = new THREE.Group(); sign.position.set(-1.0, 3.25, DZ + .55); g.add(sign); dyn.sign = sign;
  const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, .75, .07), [sgM, sgM, sgM, sgM, new THREE.MeshLambertMaterial({ map: front }), new THREE.MeshLambertMaterial({ map: backT })]); board.position.y = -.55; board.rotation.z = -.06; sign.add(board);
  for (const s of [-1, 1]) { const ch = box(sign, .02, .32, .02, s * 1.0, -.14, 0, flat('#4a4a5a')); ch.userData.noShadow = true; }
  box(g, 2.6, .07, .07, -1.0, 3.27, DZ + .3, flat('#4a4a5a')); box(g, .07, .07, .62, -2.25, 3.27, DZ + .25, flat('#4a4a5a'));
  // a trash can spilling over, a flickering OPEN tube
  const can = new THREE.Mesh(new THREE.CylinderGeometry(.32, .28, .9, 16), flat('#7a8a8a')); can.position.set(4.6, .57, -4.2); can.rotation.z = .05; g.add(can);
  for (let k = 0; k < 4; k++) { const b2 = new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 8), flat(['#d8d0b0', '#8aa86a', '#c8a070', '#b8b8c8'][k])); b2.position.set(4.5 + (k - 1.5) * .14, 1.05 + (k % 2) * .06, -4.2 + (k % 2) * .1); g.add(b2); }
  const open = new THREE.Mesh(new THREE.PlaneGeometry(.9, .32), new THREE.MeshBasicMaterial({ map: signTex((c, w, h) => { c.fillStyle = '#1a1424'; c.fillRect(0, 0, w, h); lettering(c, 'OPEN', w / 2, h / 2, 210, '#ff6a8a'); }), color: HDR(1.6, 1.3, 1.4) }));
  open.position.set(-.3, 2.2, DZ + .12); g.add(open); dyn.openSign = open;
  // ---- inside the diner
  const inside = new THREE.Group(); g.add(inside); dyn.inside = inside;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.8), painted(checkerTex({ rep: [6, 3.4] }))); fl.rotation.x = -Math.PI / 2; fl.position.set(0, .012, DZ - 3.4); inside.add(fl);
  const wallIn = painted(plasterTex({ base: '#a8c89a', stains: 9, rep: [3, 1], seed: 8 }));
  box(inside, 12, H, .1, 0, H / 2, DZ - 6.8, wallIn); box(inside, .1, H, 6.8, -6, H / 2, DZ - 3.4, wallIn); box(inside, .1, H, 6.8, 6, H / 2, DZ - 3.4, wallIn);
  box(inside, 12, .1, 6.8, 0, H, DZ - 3.4, flat('#c8c8b0'));
  box(inside, 12, .9, .04, 0, .45, DZ - 6.72, flat('#7a9a7a'));                                       // wainscot
  // counter with stools, a menu board, the kitchen door with a round window
  box(inside, 7, 1.0, .7, 0, .5, DZ - 5.6, flat('#c8a868')); box(inside, 7.2, .07, .8, 0, 1.02, DZ - 5.6, flat('#d8d4c8'));
  for (let k = 0; k < 5; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .08, 16), flat('#c8323a')); st.position.set(-2.8 + k * 1.4, .72, DZ - 4.95); inside.add(st); box(inside, .06, .7, .06, -2.8 + k * 1.4, .35, DZ - 4.95, flat('#9a9aa8')); }
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.1), new THREE.MeshLambertMaterial({ map: signTex((c, w, h) => { c.fillStyle = '#3a4a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c8a060'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14);
    lettering(c, 'MENU', w / 2, h * .2, 70, '#f6f0dc'); c.font = `700 44px ${FONT}`; c.fillStyle = '#e8e0c8'; c.textAlign = 'left';
    ['COLD SOUP ...... $2', 'HARD BREAD .... $1', 'SOUP OF YESTERDAY $3'].forEach((s, i) => c.fillText(s, 90, h * (.45 + i * .18))); }, 1024, 440) }));
  menu.position.set(-1.5, 2.55, DZ - 6.74); inside.add(menu);
  const kd = box(inside, 1.0, 2.2, .06, 4.2, 1.1, DZ - 6.72, flat('#c8a060')); const kw = new THREE.Mesh(new THREE.CircleGeometry(.18, 20), new THREE.MeshBasicMaterial({ color: '#f2e2b0' })); kw.position.set(4.2, 1.6, DZ - 6.68); inside.add(kw);
  // his booth by the window: a red vinyl bench behind him, a table, the cold soup, hard bread, a spoon, a fly
  const vinyl = flat('#c8424a');
  box(inside, 1.6, .45, .55, TABLE.x, .22, DZ - .38, vinyl); box(inside, 1.6, .75, .14, TABLE.x, .72, DZ - .18, vinyl);
  box(inside, .1, .12, .08, TABLE.x - .3, .72, DZ - .1, flat('#e8c8a0'));                              // tape on a split in the vinyl
  box(inside, 1.3, .06, .78, TABLE.x, TABLE.y, TABLE.z, flat('#d8d0b0')); box(inside, .1, .72, .1, TABLE.x, .36, TABLE.z, flat('#9a9aa8'));
  const bowlG = new THREE.LatheGeometry([[0, 0], [.07, 0], [.11, .03], [.13, .09], [.135, .095]].map(([r, y]) => new THREE.Vector2(r, y)), 28);
  const bowl = new THREE.Mesh(bowlG, flat('#f2ead8', { side: THREE.DoubleSide })); bowl.position.set(TABLE.x, TABLE.y + .03, TABLE.z + .12); inside.add(bowl); dyn.bowl = bowl;
  const soup = new THREE.Mesh(new THREE.CircleGeometry(.125, 28), flat('#a8a898')); soup.rotation.x = -Math.PI / 2; soup.position.set(0, .085, 0); bowl.add(soup); dyn.soup = soup;
  const skin = new THREE.Mesh(new THREE.CircleGeometry(.07, 12), flat('#c8c8a8')); skin.rotation.x = -Math.PI / 2; skin.position.set(.03, .087, -.02); skin.scale.set(1, .6, 1); bowl.add(skin);
  const bread = new THREE.Mesh(new THREE.SphereGeometry(.12, 14, 10), flat('#c89050')); bread.scale.set(1.3, .65, .8); bread.position.set(TABLE.x + .38, TABLE.y + .1, TABLE.z + .05); inside.add(bread); dyn.bread = bread;
  const spoon = box(inside, .02, .01, .2, TABLE.x - .22, TABLE.y + .035, TABLE.z + .1, flat('#c8ccd8')); dyn.spoon3 = spoon;
  dyn.fly = new THREE.Mesh(new THREE.SphereGeometry(.018, 8, 6), new THREE.MeshBasicMaterial({ color: '#2a2236' })); dyn.fly.layers.set(1); inside.add(dyn.fly);
  // the hot bowl that comes out warm (and goes straight back)
  dyn.hotBowl = new THREE.Mesh(bowlG, flat('#f2ead8', { side: THREE.DoubleSide })); const hs = new THREE.Mesh(new THREE.CircleGeometry(.125, 28), flat('#f0a038')); hs.rotation.x = -Math.PI / 2; hs.position.y = .085; dyn.hotBowl.add(hs); inside.add(dyn.hotBowl);
  // the tube light: cool, greenish, it flickers. The diner's only key inside.
  const tube = box(inside, 1.4, .08, .12, TABLE.x, H - .25, TABLE.z - .2, new THREE.MeshBasicMaterial({ color: HDR(1.9, 2.4, 2.0) })); tube.userData.noShadow = true; dyn.tube = tube;
  for (const s of [-1, 1]) { const w2 = box(inside, .02, .2, .02, TABLE.x + s * .6, H - .12, TABLE.z - .2, flat('#4a4a5a')); w2.userData.noShadow = true; }
  dyn.tubeL = new THREE.PointLight('#c8ffd8', 4.5, 7, 1.4); dyn.tubeL.position.set(TABLE.x, H - .4, TABLE.z - .2); dyn.tubeL.castShadow = true; dyn.tubeL.shadow.mapSize.set(1024, 1024); dyn.tubeL.shadow.bias = -.002; inside.add(dyn.tubeL);
  const bulb2 = new THREE.PointLight('#d8ffe0', 2.0, 8, 1.4); bulb2.position.set(2.5, H - .4, DZ - 4); inside.add(bulb2);
  // a sad plant in the window corner
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.15, .12, .25, 12), flat('#c8663a')); pot.position.set(-5.4, .125, DZ - .4); inside.add(pot);
  for (let k = 0; k < 3; k++) { const lf = box(inside, .04, .35, .12, -5.4 + (k - 1) * .08, .38, DZ - .4, flat('#a8a858')); lf.rotation.z = (k - 1) * .7 + .4; }
  // ---- the GOLDEN SPOON across the street
  const fac = painted(stoneFacadeTex({ rep: [3, 1.2] }));
  const fb = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 6), [fac, fac, flat('#c8b8a0'), fac, fac, fac]); fb.position.set(0, 3, FZ + 3); g.add(fb);
  box(g, 16.2, .3, .4, 0, 6.0, FZ - .05, flat('#f6f0dc')); box(g, 16.2, .16, .3, 0, 3.12, FZ - .05, flat('#f6f0dc'));
  const insideTex = fancyInsideTex(), glassM = new THREE.MeshBasicMaterial({ map: insideTex, color: HDR(1.35, 1.25, 1.1) });
  const arch = (x, y, w, h) => {
    const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); sh.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), glassM); m.position.set(x, y, FZ - .02); m.rotation.y = Math.PI; g.add(m);
    const fr = new THREE.Mesh(new THREE.TorusGeometry(w / 2 + .04, .07, 6, 24, Math.PI), flat('#f6f0dc')); fr.position.set(x, y + h - w / 2, FZ - .06); g.add(fr);
    for (const s of [-1, 1]) box(g, .14, h - w / 2, .14, x + s * (w / 2 + .04), y + (h - w / 2) / 2, FZ - .06, flat('#f6f0dc'));
    box(g, w + .3, .12, .3, x, y - .06, FZ - .1, flat('#f6f0dc')); box(g, .05, h - .2, .06, x, y + (h - .2) / 2, FZ - .05, flat('#c8962a'));
  };
  arch(-4.6, .9, 2.2, 2.4); arch(4.6, .9, 2.2, 2.4); for (const x of [-4.6, 0, 4.6]) arch(x, 4.0, 1.3, 1.6);
  // door, awning, carpet, rope line, topiaries
  const dm = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.6), glassM); dm.position.set(0, 1.3, FZ - .02); dm.rotation.y = Math.PI; g.add(dm);
  for (const s of [-1, 1]) box(g, .16, 2.7, .16, s * .98, 1.35, FZ - .08, flat('#c8962a'));
  const aw = new THREE.Mesh(new THREE.BoxGeometry(3.0, .12, 1.6), flat('#8a2a3a')); aw.position.set(0, 3.0, FZ - .8); aw.rotation.x = -.18; g.add(aw);
  box(g, 3.04, .2, .06, 0, 2.86, FZ - 1.58, flat('#e8b23e'));
  const carpet = box(g, 1.4, .02, 2.2, 0, .13, FZ - 1.1, flat('#b8283a')); carpet.userData.noShadow = true;
  for (const s of [-1, 1]) for (const z of [FZ - .4, FZ - 1.3, FZ - 2.2]) { box(g, .06, .9, .06, s * 1.0, .58, z, flat('#e8b23e')); const top = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), flat('#e8b23e')); top.position.set(s * 1.0, 1.05, z); g.add(top); }
  for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.45, .025, 6, 16, Math.PI), flat('#b8283a')); r.rotation.z = Math.PI; r.rotation.y = Math.PI / 2; r.position.set(s * 1.0, .95, FZ - .85); r.scale.set(1, .4, 1); g.add(r); const r2 = r.clone(); r2.position.z = FZ - 1.75; g.add(r2); }
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.25, .2, .45, 12), flat('#f6f0dc')); p.position.set(s * 1.8, .35, FZ - .45); g.add(p);
    for (const [y, r] of [[.85, .32], [1.4, .25], [1.85, .17]]) { const b2 = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), flat('#4a9a5a')); b2.position.set(s * 1.8, y, FZ - .45); g.add(b2); } }
  // the golden sign, with HIS face on its medallion (there all along)
  const gs = new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.0, .12), [flat('#c8962a'), flat('#c8962a'), flat('#c8962a'), flat('#c8962a'), flat('#c8962a'),
    new THREE.MeshLambertMaterial({ map: signTex((c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe08a'); gr.addColorStop(1, '#d8a030'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8a5a10'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14); portrait(c, w * .1, h / 2, h * .4, '#fff0c0'); lettering(c, 'GOLDEN SPOON', w * .56, h / 2 + 4, 120, '#6a3a10', '#fff0c0'); }, 1536, 250), emissive: '#4a3000' })]);
  gs.position.set(0, 3.75, FZ - .12); g.add(gs); dyn.goldSign = gs;
  dyn.medallion = V(2.48, 3.75, FZ - .2);                       // the portrait's world position (the sign faces -z, so it is mirrored)
  // neighbours: brick shops on both sides, street lamps (they glow), a bench
  for (const [x, z, col, w2] of [[-10, DZ - 3, '#c8785a', 6], [10, DZ - 3, '#b8a0d8', 6], [-16, DZ - 3, '#d8b05a', 6], [16, DZ - 3, '#9ab8d8', 6],
    [-11, FZ + 3, '#a8c8a0', 6], [11, FZ + 3, '#d89aa8', 6], [-17, FZ + 3, '#c8a8e0', 6], [17, FZ + 3, '#e0b878', 6]]) {
    const hh = 4.5 + hash(x) * 2.5; const b = box(g, w2, hh, 6, x, hh / 2, z, painted(brickTex({ base: col, rep: [2, 2] })));
    box(g, w2 + .2, .2, .4, x, hh, z + Math.sign(-z) * 3.05, flat('#f6f0dc'));
    for (const dx of [-1.6, 1.6]) { const wm = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), new THREE.MeshBasicMaterial({ color: '#cfe0f0' })); wm.position.set(x + dx, 2.6, z + Math.sign(-z) * 3.01); if (z > 0) wm.rotation.y = Math.PI; g.add(wm); }
  }
  dyn.lamps = [];
  for (const [x, z] of [[-6.5, -3.4], [6.5, -3.4], [-6.5, 3.5], [6.5, 3.5]]) {
    box(g, .1, 3.6, .1, x, 1.8, z, flat('#3a4a5a')); const lm = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10), new THREE.MeshBasicMaterial({ color: HDR(2.6, 2.0, 1.2) })); lm.position.set(x, 3.7, z); g.add(lm); dyn.lamps.push(lm);
  }
  // light: the low sun runs down the street from +x (warm, shadows); the sky is the fill (cool)
  const L = new THREE.Group();
  dyn.hemi = new THREE.HemisphereLight('#a8b0ff', '#7a6a8a', 1.6); L.add(dyn.hemi);
  const sun = new THREE.DirectionalLight('#ffc888', 3.2); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 140 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
  L.add(sun); L.add(sun.target); dyn.sun = sun;
  const warm = new THREE.PointLight('#ffc070', 6, 9, 1.5); warm.position.set(0, 2.2, FZ - 1.5); L.add(warm);   // the fancy place's light spills onto its pavement
  scene.add(L); dyn.streetL = L;
  // the newspaper (spins in for "the headline")
  dyn.paper = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshBasicMaterial({ map: newspaperTex(), side: THREE.DoubleSide })); dyn.paper.layers.set(1); dyn.paper.renderOrder = 30; scene.add(dyn.paper);
  shadows(g);
}

// ---------------------------------------------------------------- KITCHEN (x = 200, night)
function buildKitchen(scene) {
  const g = new THREE.Group(); g.position.x = 200; scene.add(g); dyn.kitchen = g;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), painted(checkerTex({ a: '#e8e2d0', b: '#c84a4a', grime: .15, rep: [3, 2.5] }))); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const tile = painted(subwayTex({ rep: [4, 2] }));
  box(g, 6, 3.2, .1, 0, 1.6, -2.0, tile); box(g, .1, 3.2, 5, -3, 1.6, .5, tile); box(g, 6, .1, 5, 0, 3.2, .5, flat('#d8d4c8'));
  // the stove, a pot of soup, the bread board, parsley, shelves with tins
  box(g, 1.8, .9, .8, -.2, .45, -1.5, flat('#c8ccd8')); box(g, 1.84, .06, .84, -.2, .92, -1.5, flat('#5a5a6a'));
  for (const x of [-.65, .25]) { const b = new THREE.Mesh(new THREE.TorusGeometry(.16, .02, 6, 20), new THREE.MeshBasicMaterial({ color: HDR(2.4, .9, .4) })); b.rotation.x = Math.PI / 2; b.position.set(x, .96, -1.45); g.add(b); }
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.26, .22, .36, 24), flat('#9aa6bc')); pot.position.set(-.65, 1.14, -1.45); g.add(pot);
  const soupT = new THREE.Mesh(new THREE.CircleGeometry(.24, 24), flat('#f0a038')); soupT.rotation.x = -Math.PI / 2; soupT.position.set(-.65, 1.3, -1.45); g.add(soupT);
  box(g, 1.4, .9, .7, 1.6, .45, -1.55, painted(woodTex({ base: '#c8955a', rep: [1, 1] }))); box(g, 1.44, .05, .74, 1.6, .92, -1.55, flat('#e0c088'));
  dyn.loaves = [];
  for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(.14, 14, 10), flat('#e0a050')); l.scale.set(1.5, .7, .9); l.position.set(1.25 + k * .34, 1.0, -1.5); g.add(l); dyn.loaves.push(l); }
  for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), flat('#4aa848')); p.position.set(.95 + (k % 3) * .06, .98, -1.25 + Math.floor(k / 3) * .06); g.add(p); }
  box(g, 2.4, .05, .3, 0, 2.2, -1.85, painted(woodTex({ base: '#a87a4a' })));
  for (let k = 0; k < 6; k++) { const tin = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, .22, 12), flat(['#e8503a', '#3a8ad8', '#f2c23a', '#4aa86a', '#c86ad8', '#e8903a'][k])); tin.position.set(-1.0 + k * .4, 2.34, -1.85); g.add(tin); }
  // a night window on the left wall
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1), new THREE.MeshBasicMaterial({ color: HDR(.35, .45, 1.05) })); win.position.set(-2.94, 1.9, -.4); win.rotation.y = Math.PI / 2; g.add(win);
  for (const [w, h, y, z] of [[.1, 1.2, 1.9, -.4], [.1, .08, 2.5, -.4], [.1, .08, 1.3, -.4]]) box(g, w, h, 1.3, -2.92, y, z, flat('#f6f0dc'));
  const moonDot = new THREE.Mesh(new THREE.CircleGeometry(.12, 20), new THREE.MeshBasicMaterial({ color: HDR(2.2, 2.2, 1.9) })); moonDot.position.set(-2.92, 2.15, -.15); moonDot.rotation.y = Math.PI / 2; g.add(moonDot);
  // the hanging lamp: warm, the key
  box(g, .02, .6, .02, -.2, 2.9, -.6, flat('#3a3a4a'));
  const shadeM = new THREE.Mesh(new THREE.ConeGeometry(.3, .25, 20, 1, true), flat('#3a8a7a', { side: THREE.DoubleSide })); shadeM.position.set(-.2, 2.5, -.6); g.add(shadeM);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), new THREE.MeshBasicMaterial({ color: HDR(3, 2.4, 1.4) })); bulb.position.set(-.2, 2.38, -.6); g.add(bulb);
  const L = new THREE.Group();
  L.add(new THREE.HemisphereLight('#6a7ae8', '#3a3058', 2.0));
  const kl = new THREE.PointLight('#ffc070', 8, 9, 1.3); kl.position.set(-.2, 2.3, -.6); kl.castShadow = true; kl.shadow.mapSize.set(1024, 1024); kl.shadow.bias = -.002; L.add(kl);
  L.position.x = 200; scene.add(L); dyn.kitchenL = L; dyn.potTop = V(199.35, 1.32, -1.45);
  shadows(g);
}

// ---------------------------------------------------------------- DIAGRAM (x = 300): the seesaw
function buildDiagram(scene) {
  const g = new THREE.Group(); g.position.x = 300; scene.add(g); dyn.diagram = g;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), flat('#e8d8f0')); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), painted(signTex((c, w, h) => { c.fillStyle = '#b8d8f0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9ac0e0'; c.lineWidth = 16; for (let x = -h; x < w; x += 80) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + h, 0); c.stroke(); } }, 1024, 512)));
  wall.position.set(0, 6, -6); g.add(wall);
  const fs = new THREE.Shape(); fs.moveTo(-.6, 0); fs.lineTo(.6, 0); fs.lineTo(0, 1.0); fs.closePath();
  const ful = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: .6, bevelEnabled: false }), flat('#8a6ad8')); ful.position.set(0, 0, -.3); g.add(ful);
  const plank = new THREE.Group(); plank.position.set(0, 1.05, 0); plank.scale.setScalar(.72); g.add(plank); dyn.plank = plank;
  box(plank, 6.4, .14, .5, 0, 0, 0, flat('#e8a040'));
  const mini = (x, col, roof, text, tcol) => {
    const m = new THREE.Group(); m.position.set(x, .07, 0); plank.add(m);
    box(m, 1.4, 1.0, .9, 0, .5, 0, flat(col)); box(m, 1.5, .12, 1.0, 0, 1.06, 0, flat(roof));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .42), new THREE.MeshLambertMaterial({ map: signTex((c, w, h) => { c.fillStyle = tcol[0]; c.fillRect(0, 0, w, h); c.strokeStyle = tcol[1]; c.lineWidth = 20; c.strokeRect(10, 10, w - 20, h - 20); lettering(c, text, w / 2, h / 2 + 6, 190, tcol[1]); }, 1024, 330) }));
    s.position.set(0, 1.45, .2); m.add(s); box(m, .5, .6, .02, 0, .35, .46, flat(shade(col, .6)));
    return m;
  };
  dyn.miniWorst = mini(-2.4, '#9ec4b0', '#7a9a8a', 'WORST', ['#e8dcae', '#4a6a5a']);
  dyn.miniBest = mini(2.4, '#efe2c4', '#e8b23e', 'BEST', ['#ffe08a', '#8a2a3a']);
  const L = new THREE.Group(); L.add(new THREE.HemisphereLight('#c8d0ff', '#9a8ab0', 1.6));
  const sun = new THREE.DirectionalLight('#ffe0b0', 2.6); sun.position.set(296, 12, 10); sun.target.position.set(300, 0, 0); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 }); L.add(sun); L.add(sun.target); scene.add(L); dyn.diagramL = L;
  shadows(g);
}

// ---------------------------------------------------------------- CAST
export const LOOK = {
  him: { hat: 'bowler', hatColor: '#4a3a5a', cloth: '#7a5aa8', bowtie: '#e8b23e', mustache: '#4a3a5a', hair: '#4a3a5a', height: 1.74, buttons: '#f2c23a' },
  waiter: { cloth: '#e8e0c8', apron: true, mustache: '#6a5a4a', hair: '#7a6a5a', height: 1.66, headW: 282, headH: 252, pocket: true },
  friend1: { hat: 'cap', hatColor: '#3a8ad8', cloth: '#e8703a', height: 1.74, pocket: true },
  friend2: { hat: 'bun', hairColor: '#c86a3a', body: 'robe', cloth: '#4aa86a', height: 1.64, headW: 262, headH: 248, collar: false },
  cook: { hat: 'cook', cloth: '#f6f2ea', apron: false, height: 1.64, buttons: '#3a8ad8', headW: 266, headH: 250 },
  fancyM: { hat: 'top', hatColor: '#3a3a5a', cloth: '#3a3a5a', bowtie: '#c8323a', height: 1.8, mustache: true, hair: '#2e2026', buttons: '#e8b23e' },
  fancyW: { hat: 'bun', hairColor: '#e8c050', body: 'robe', cloth: '#d8506a', sash: '#f2c23a', height: 1.68, headW: 262, headH: 248, collar: false },
  couple1: { hat: 'cap', hatColor: '#f2c23a', cloth: '#3aa8b8', height: 1.76 },
  couple2: { hat: 'bun', hairColor: '#4a2a20', body: 'robe', cloth: '#f08a3a', height: 1.64, headW: 262, headH: 248, collar: false },
  critic: { hat: 'beret', hatColor: '#c8323a', cloth: '#3a4a7a', scarf: '#f2c23a', mustache: true, hair: '#4a3020', height: 1.72 },
  fwaiter: { cloth: '#2e2a3e', bowtie: '#f6f2ea', hair: '#2e2026', height: 1.72, buttons: '#e8b23e' },
};
function extra(toon) {
  const m = new THREE.Mesh(toon.mesh.geometry, toon.mat); m.layers.set(1); C.scene.add(m);
  const s = new THREE.Mesh(toon.shadow.geometry, toon.shadow.material); s.layers.set(1); s.renderOrder = -1; C.scene.add(s);
  const e = { m, s, hide() { m.visible = s.visible = false; }, place(x, y, z, sc = 1) { m.visible = s.visible = true; m.position.set(x, y, z); m.scale.setScalar(sc); m.rotation.y = Math.atan2(C.cam.position.x - x, C.cam.position.z - z); s.position.set(x, y + .012, z); s.scale.set(sc * .82, 1, sc * .55); s.rotation.y = m.rotation.y; } };
  extras.push(e); return e;
}

// ---------------------------------------------------------------- CAMERA
const HOOKCAM = { pos: [-1.55, 1.27, -7.45], look: [-2.0, 1.2, -5.7], fov: 40 };
function cameraPath() {
  const t = W;
  const keys = [
    { t: 0, ...HOOKCAM, creep: .3, drift: .05 },                                                                              // he smiles over the cold soup
    { t: t('every') + .05, dur: .3, move: 'whip', pos: [1.8, 1.5, 1.6], look: [-.9, 2.7, DZ], fov: 50, creep: .28 },          // the dump's sign
    { t: t('soup') + .1, dur: .3, move: 'whip', pos: [-1.8, 1.25, -6.68], look: [TABLE.x, .76, TABLE.z + .12], fov: 34, creep: .3, drift: .02 },   // cold soup, a skin
    { t: t('bread') - .1, dur: .5, pos: [-1.15, 1.3, -7.3], look: [-1.9, 1.0, -5.8], fov: 42, creep: .28, drift: .04 },        // bread like a brick
    { t: t('waiter') - .05, dur: .5, pos: [.4, 1.5, -8.5], look: [-1.4, 1.25, -6.0], fov: 46, creep: .27 },                  // the sneeze
    { t: t('across') + .6, dur: 1.7, pos: [-1.5, 1.65, -2.4], look: [-1.0, 2.2, FZ], fov: 50, creep: .25 },                   // through the window, across the street
    { t: t('line', 1) + .1, dur: 1.2, pos: [-3.5, 2.3, .8], look: [-6.5, 1.3, 4.1], fov: 50, creep: .25 },                    // the line out the door
    { t: t('friends') - .05, dur: .3, move: 'whip', pos: [-2.0, 1.6, -10.35], look: [-2.0, 1.25, -6.1], fov: 54, creep: .26 },
    { t: t('never') - .1, dur: .45, pos: [-1.62, 1.27, -7.15], look: [-2.0, 1.22, -5.65], fov: 36, creep: .28, drift: .04 },
    { t: t('same', 1) + .05, dur: .3, move: 'whip', pos: [-1.9, 3.0, -7.7], look: [TABLE.x, .8, -5.9], fov: 48, creep: .16 },  // time-lapse
    { t: t('ever') - .2, dur: .3, move: 'whip', pos: [.3, 1.5, -8.4], look: [-1.5, 1.15, -5.95], fov: 44, creep: .27 },
    { t: t('night,'), move: 'cut', pos: [201.0, 1.6, 1.9], look: [200.0, 1.3, -1.4], fov: 46, creep: .26 },
    { t: t('fresh') + .05, dur: .8, pos: [200.65, 1.5, 1.0], look: [200.4, 1.0, -1.4], fov: 46, creep: .28 },
    { t: t('next', 1), move: 'cut', pos: [5.0, 1.5, -1.0], look: [2.5, 1.3, -4.9], fov: 46, creep: .26 },                     // morning: the cook walks out
    { t: t('who', 1) - .05, dur: .5, pos: [4.0, 1.55, -1.7], look: [2.6, 1.4, -4.9], fov: 40, creep: .28 },
    { t: t('owns', 1) - .05, dur: .3, move: 'whip', pos: [-1.0, 2.3, -1.2], look: [-1.0, 2.75, DZ + .55], fov: 46, creep: .27 },  // the sign spins: OWNER
    { t: t('also') - .05, dur: .3, move: 'whip', pos: [.8, 2.4, .6], look: [0, 3.6, FZ], fov: 52, creep: .25 },               // across the street: the Golden Spoon
    { t: t('right') + .05, dur: 1.0, pos: [2.2, 3.8, 2.4], look: [2.48, 3.75, FZ], fov: 34, creep: .3 },                      // his face on the gold medallion
    { t: t('you') - .05, dur: .3, move: 'whip', pos: [6.8, 1.8, 1.6], look: [.5, 1.3, -3.6], fov: 52, creep: .22 },           // down the street: the couple
    { t: t('worse') - .05, dur: .3, move: 'whip', pos: [300, 2.4, 11.5], look: [300, 1.4, 0], fov: 46, creep: .25 },
    { t: t('so', 1) - .05, dur: .3, move: 'whip', ...HOOKCAM, creep: .28, drift: .04 },
    { t: t('then,') - .05, dur: .3, move: 'whip', pos: [6.0, 1.6, -1.2], look: [2.4, 1.4, -4.6], fov: 46, creep: .26 },       // the critic, the wrong door
    { t: t('next', 2) - .05, dur: .3, move: 'whip', pos: [0, 1.6, 0], look: [0, 1.6, -5], fov: 40, creep: .2 },               // the headline
    { t: t('now') - .05, dur: .3, move: 'whip', pos: [11, 5.5, 1.2], look: [-1.5, .6, -1.5], fov: 50, creep: .2 },            // the line is on the wrong side
    { t: t('wrong') + .05, dur: .3, move: 'whip', ...HOOKCAM, fov: 36, creep: .3, drift: .03 },                                // he drops his spoon
  ];
  const cp = new CamPath(keys, { fps: FPS });
  cp.kick(t('bread') + .35, .5); cp.kick(t('bread') + .65, .5); cp.kick(t('sneezes') + .05, .8); cp.kick(t('fired.') + .02, .8); cp.kick(t('wrong') + .3, .6);
  return cp;
}

// ---------------------------------------------------------------- SETUP
export async function setup(ctx) {
  C = ctx; W = wordTimes(ctx.words);
  DUR = Math.ceil((ctx.words[ctx.words.length - 1].end + .6) * FPS) / FPS;
  const { scene } = ctx;
  scene.background = new THREE.Color('#f0a890');
  buildStreet(scene); buildKitchen(scene); buildDiagram(scene);
  for (const [k, l] of Object.entries(LOOK)) cast[k] = new Toon(l, scene);
  dyn.lineF = []; for (let i = 0; i < 16; i++) dyn.lineF.push(extra(cast[['fancyM', 'fancyW', 'couple1', 'couple2'][i % 4]]));
  dyn.lineD = []; for (let i = 0; i < 18; i++) dyn.lineD.push(extra(cast[['fancyM', 'fancyW', 'friend1', 'friend2', 'couple1', 'couple2'][i % 6]]));
  dyn.steam = new Smoke(scene, { color: '#f2eef6', maxPoints: 600, H: ctx.H });
  dyn.spray = new Smoke(scene, { color: '#d8f0ff', maxPoints: 200, H: ctx.H });
  dyn.cam = cameraPath();
  const cue = (t, type, extra = {}) => CUES.push({ t: +t.toFixed(3), type, ...extra });
  cue(W('night,') - .2, 'whoosh'); cue(W('worse') - .35, 'whoosh'); cue(W('then,') - .35, 'whoosh');
  for (const [w, n] of [['every', 1], ['soup', 1], ['friends', 1], ['same', 1], ['ever', 1], ['owns', 1], ['also', 1], ['you', 1], ['so', 1], ['next', 2], ['now', 1], ['wrong', 1]]) cue(W(w, n) - .12, 'rise', { dur: .35 });
  cue(W('bread') + .35, 'lock'); cue(W('bread') + .65, 'lock'); cue(W('sneezes'), 'boom'); cue(W('sends'), 'scrape', { dur: .5 });
  cue(W('night,'), 'cut'); cue(W('night,'), 'simmer', { dur: W('next', 1) - W('night,') }); cue(W('fired.'), 'boom'); cue(W('owns', 1) + .3, 'shimmer');
  cue(W('right') + .4, 'shimmer'); cue(W('worse'), 'scrape', { dur: 1.2 }); cue(W('mistake.'), 'lock'); cue(W('next', 2), 'rise', { dur: .6 }); cue(W('genius.'), 'shimmer'); cue(W('wrong') + .3, 'lock');
}

// ---------------------------------------------------------------- PER FRAME
const SUNDIR = V(-.7, -.42, -.5);
export function frame(t, ctx) {
  const { cam, env } = ctx, T = W;
  const cp = dyn.cam.apply(cam, t);
  const where = cam.position.x < 150 ? 'street' : cam.position.x < 250 ? 'kitchen' : 'diagram';
  dyn.street.visible = dyn.streetL.visible = where === 'street'; dyn.kitchen.visible = dyn.kitchenL.visible = where === 'kitchen'; dyn.diagram.visible = dyn.diagramL.visible = where === 'diagram';
  const A = (w, n) => W(w, n) - 2 / FPS, bl = (seed, ...sw) => blinkAt(t, seed, sw, FPS);
  for (const c of Object.values(cast)) c.hide(); for (const e of extras) e.hide();
  // ---- light: the sun runs round the sky in the time-lapse ("same table, same cold soup, every single day")
  const tLap0 = T('same', 1) + .05, tLap1 = T('ever') - .3, lapse = t > tLap0 && t < tLap1;
  let sd = SUNDIR.clone(), sk = 3.2, hk = 1.6, tubeK = 1;
  if (lapse) { const a = (t - tLap0) * 3.2 * Math.PI * 2, day = Math.max(0, Math.sin(a)); sd = V(-Math.cos(a) * .8, -.15 - .6 * day, .3); sk = .3 + 3.2 * day; hk = .5 + .9 * day; }
  dyn.sun.position.copy(sd).multiplyScalar(-60); dyn.sun.target.position.set(0, 0, 0); dyn.sun.intensity = sk; dyn.hemi.intensity = hk;
  dyn.sunDisc.position.copy(cam.position).addScaledVector(sd.normalize(), -150); dyn.sunDisc.lookAt(cam.position);
  const fl = Math.sin(t * 37) * Math.sin(t * 13.3) > .55 ? .35 : 1;               // the tube stutters now and then
  dyn.tubeL.intensity = 4.5 * fl * tubeK; dyn.tube.material.color.setRGB(1.9 * fl, 2.4 * fl, 2.0 * fl);
  dyn.openSign.material.color.setRGB(Math.sin(t * 5) > .7 ? .3 : 1.6, 1.3 * (Math.sin(t * 5) > .7 ? .3 : 1), 1.4);
  // ---- props
  dyn.fly.position.set(TABLE.x + Math.cos(t * 7) * .18, TABLE.y + .22 + Math.sin(t * 11) * .06, TABLE.z + .12 + Math.sin(t * 7) * .14);
  const knock = Math.max(0, Math.sin((t - T('bread')) * 18)) * (t > T('bread') && t < T('hard,') + .4 ? 1 : 0);
  dyn.bread.position.y = TABLE.y + .1 + knock * .12;
  const hotIn = T('ever') - .1, sendBack = T('sends');
  dyn.hotBowl.visible = t > hotIn && t < T('night,');
  const hb = ramp(t, hotIn, hotIn + .5), back = ramp(t, sendBack, sendBack + .45);
  dyn.hotBowl.position.set(TABLE.x + lerpN(1.0, .0, hb) + back * 1.0, TABLE.y + .03 + (1 - hb) * .3 + back * .25, TABLE.z + .12 - back * .3);
  dyn.bowl.visible = !(t > hotIn && t < T('night,'));
  // the sign spins round on its chains at "He owns"
  dyn.sign.rotation.y = Math.PI * backOut(lin(t, T('owns', 1) + .15, T('owns', 1) + .75)) * (t < T('also') + .5 || t > T('now') - .3 ? 1 : 0) + .04 * Math.sin(t * 1.7);
  if (t >= T('now') - .3) dyn.sign.rotation.y = .04 * Math.sin(t * 1.7);
  // the door opens for the cook and for the critic
  dyn.door.rotation.y = -1.3 * (ramp(t, T('next', 1) - .1, T('next', 1) + .3) * (1 - ramp(t, T('who', 1), T('who', 1) + .3)) + ramp(t, T('walks', 2) + .2, T('walks', 2) + .6) * (1 - ramp(t, T('next', 2) - .2, T('next', 2))));
  // the seesaw: WORST goes down, BEST goes up
  dyn.plank.rotation.z = lerpN(0, .32, backOut(lin(t, T('worse') + .1, T('worse') + .6))) + .05 * Math.sin(t * 3) * (1 - lin(t, T('worse'), T('looks.')));
  // the newspaper spins in
  const np = lin(t, T('next', 2) - .05, T('headline:') + .1);
  dyn.paper.visible = t > T('next', 2) - .1 && t < T('now') - .05;
  if (dyn.paper.visible) { const k = backOut(np); dyn.paper.position.set(0, 1.6, -4.0); dyn.paper.rotation.set(0, 0, (1 - np) * Math.PI * 4); dyn.paper.scale.setScalar(Math.max(.01, k)); }
  // ---- cast
  const tint = [1, 1, 1];
  const DAYSH = '#e8e3f4', TUBE = { color: '#b8ffd0', a: .28 }, WARMR = { color: '#ffc070', a: .32 };
  const P = (c, x, y, z, s = 1) => { c.show(); c.place(x, y, z, cam, tint, s); c.castFrom(sd, true); return c; };
  const inn = { lit: 1, shade: '#d8e8e0', rim: TUBE }, out = { lit: 1, shade: DAYSH, rim: WARMR };
  const seated = (k, base) => P(cast.him, TABLE.x, -.46, -5.66);
  let steamOn = false, sprayOn = false;
  if (where === 'street') {
    // hook: he smiles over the cold soup
    if (t < T('every') - .2 || (t > T('soup') - .2 && t < T('across') + .2) || (t > T('friends') - .3 && t < T('night,')) || (t > T('so') - .3 && t < T('then,')) || t > T('wrong') - .2) {
      seated();
      const end = t > T('wrong') + .1, satisfied = t > T('so') - .3 && t < T('then,'), pushBack = t > A('sends') && t < T('night,'), warmNow = t > hotIn && t < A('sends');
      const friendsBeg = t > T('friends') - .3 && t < T('never') - .1, never = t > A('never') && t < T('same') + .05;
      const sip = satisfied || (t < T('every') - .2) ? Math.max(0, Math.sin(t * 2.4)) : 0;
      cast.him.draw({ ...inn, expr: end ? 'surprised' : warmNow ? 'angry' : pushBack ? 'smug' : never ? 'smug' : friendsBeg ? 'neutral' : 'smile', look: never ? Math.sin(t * 9) * .7 : .1, lookY: end ? -.3 : .5,
        blink: bl(1, A('sends'), A('never'), A('wrong')), brow: end ? 1 : 0, lid: satisfied ? .2 : 0,
        armR: end ? [30, 10] : pushBack ? [lerpN(60, 95, ramp(t, A('sends'), A('sends') + .3)), 10] : t > T('bread') - .2 && t < T('waiter') - .2 ? [70 + knock * 30, 40] : [50 + sip * 30, 70 + sip * 20],
        propR: end ? null : t > T('bread') - .2 && t < T('waiter') - .2 ? 'bread' : 'spoonUp', armL: [30, 50] });
      if (end) { const k = lin(t, T('wrong') + .1, T('wrong') + .45); dyn.spoon3.position.set(TABLE.x - .22, TABLE.y + .035 + (1 - k) * .4, TABLE.z + .1); dyn.spoon3.rotation.z = k * 2; }
      else { dyn.spoon3.position.set(TABLE.x - .22, TABLE.y + .035, TABLE.z + .1); dyn.spoon3.rotation.z = 0; }
    }
    // the waiter: sneezes on everything; brings the warm bowl, takes it back
    if ((t > T('waiter') - .3 && t < T('across') + .3) || (t > hotIn - .3 && t < T('night,'))) {
      const sneeze = t > A('sneezes') && t < T('everything.') + .3, pre = t > T('waiter') && t < A('sneezes');
      P(cast.waiter, -.95, 0, -6.35);
      cast.waiter.draw({ ...inn, expr: sneeze ? 'surprised' : pre ? 'worried' : t > sendBack ? 'worried' : 'neutral', mouth: sneeze ? 1 : 0, look: -.7, lookY: sneeze ? .3 : -.3, lid: pre ? .3 : 0,
        blink: bl(2, A('sneezes')), tilt: pre ? -8 : sneeze ? 10 : 0, lean: sneeze ? -6 : 0, armL: t > hotIn - .3 && t < sendBack + .6 ? [70, 40] : [30, 20], armR: [20, 10], propR: 'spoon' });
      if (sneeze) sprayOn = true;
    }
    // across the street: the line at the Golden Spoon (always there until the critic)
    if (t < T('now') - .3) {
      dyn.lineF.forEach((e, i) => e.place(-1.6 - i * .72, .12, 4.0 + (i % 2) * .22));
      if (t < T('friends') || (t > T('also') - .4 && t < T('worse'))) for (const k of ['fancyM', 'fancyW', 'couple1', 'couple2']) cast[k].draw({ ...out, lit: -1, expr: 'smile', look: .5, blink: bl(k.length + 3), armR: [14, 30], armL: [16, 10] });
      P(cast.fwaiter, 1.35, .12, FZ - .6); cast.fwaiter.draw({ ...out, lit: -1, expr: 'proud', look: -.4, blink: bl(9), armR: [60, 80], armL: [16, 10] });
    }
    // his friends beg him
    if (t > T('friends') - .3 && t < T('same') + .05) {
      const just = t > A('just') && t < T('street', 2) + .4;
      P(cast.friend1, -1.3, 0, -6.85); cast.friend1.draw({ ...inn, expr: just ? 'angry' : 'worried', mouth: just ? flap(env, t) : 0, look: -.6, blink: bl(3, A('just')), armR: [150, -20], armL: [70, 60], lean: -4 });
      P(cast.friend2, -2.72, 0, -6.85); cast.friend2.draw({ ...inn, expr: 'worried', look: .6, blink: bl(4), armL: [130, -10], armR: [60, 80], lean: 3 });
    }
    // morning: the cook walks out with a box; he is in the doorway with the pink slip
    if (t > T('next', 1) - .1 && t < T('owns', 1) - .2) {
      const go = lin(t, T('next', 1), T('who', 1) - .1), turned = t > A('who', 1);
      P(cast.cook, lerpN(2.6, 3.9, go), .12, lerpN(-4.9, -4.0, go)); cast.cook.draw({ ...out, expr: turned ? 'surprised' : t > A('fired.') ? 'worried' : 'neutral', look: turned ? -.8 : .5, blink: bl(5, A('fired.'), A('who', 1)), armR: [40, 70], propR: 'box', armL: [40, 70], sweat: turned ? 1 : 0, bob: turned ? 0 : -Math.abs(Math.sin(t * 8)) * 8 });
      if (t > T('who', 1) - .2) { const inn2 = ramp(t, T('who', 1) - .2, T('who', 1) + .3); P(cast.him, lerpN(2.6, 2.6, inn2), .12, lerpN(-5.6, -5.0, inn2)); cast.him.draw({ ...out, expr: t > A('him', 2) ? 'smug' : 'neutral', look: .6, blink: bl(1, A('him', 2)), armR: [t > A('him', 2) ? 110 : 60, 10], propR: 'slip', armL: [20, 10] }); }
    }
    // the critic walks into the dump by mistake
    if (t > T('then,') - .3 && t < T('next', 2) - .1) {
      const go = lin(t, T('then,'), T('walks', 2) + .5), into = lin(t, T('walks', 2) + .5, T('mistake.') + .3);
      P(cast.critic, lerpN(5.6, 2.6, go), .12, lerpN(-3.9, -4.4, go) - into * .9); cast.critic.draw({ ...out, expr: into > .3 ? 'surprised' : 'proud', look: go < 1 ? -.6 : .2, lookY: -.2, blink: bl(6, A('mistake.')), armR: [50, 70], propR: 'notebook', armL: [20, 10], bob: go < 1 ? -Math.abs(Math.sin(t * 8)) * 8 : 0 });
    }
    // "every couple who walks past that dump": stink, then hearts for the fancy place
    if (t > T('you') - .3 && t < T('worse')) {
      const go = lin(t, T('you'), T('looks.')), fancy = t > A('fancy');
      for (const [k, dz] of [['couple1', 0], ['couple2', .55]]) { P(cast[k], lerpN(5.0, -1.5, go) + dz * .3, .12, -4.0 + dz); cast[k].draw({ ...out, expr: fancy ? 'grin' : 'worried', look: fancy ? -.4 : .6, lookY: fancy ? -.4 : 0, blink: bl(k.length + 7, A('fancy')), armR: [fancy ? 60 : 20, 40], armL: [fancy ? 60 : 20, 40], lid: fancy ? 0 : .3, bob: -Math.abs(Math.sin(t * 8 + dz * 3)) * 8 }); }
    }
    // the end: the line is on the wrong side of the street; the fancy waiter yawns
    if (t > T('now') - .3) {
      dyn.lineD.forEach((e, i) => e.place(1.6 - i * .66 + (i > 8 ? -.5 : 0), .12, -3.75 - (i % 2) * .22));
      for (const k of ['fancyM', 'fancyW', 'friend1', 'friend2', 'couple1', 'couple2']) cast[k].draw({ ...out, expr: 'grin', look: .4, blink: bl(k.length), armR: [14, 30], armL: [16, 10] });
      P(cast.fwaiter, .9, .12, FZ - .7); cast.fwaiter.draw({ ...out, lit: -1, expr: 'neutral', mouth: Math.max(0, Math.sin((t - T('now')) * 2.2)), look: .3, lid: .5, blink: bl(9), armR: [150, -30], armL: [16, 10] });
    }
  } else if (where === 'kitchen') {
    const fresh = t > A('fresh');
    P(cast.cook, 199.9, 0, -.85); cast.cook.draw({ lit: 1, shade: '#d8d0f0', rim: WARMR, expr: fresh ? 'grin' : 'proud', look: .4, lookY: .4, blink: bl(5, A('fresh')),
      armR: t > A('parsley') ? [100 + 10 * Math.sin(t * 9), 30] : [70 + 15 * Math.sin(t * 6), 40], propR: t > A('parsley') ? null : 'spoon', armL: [40, 60], lean: 3 });
    steamOn = true; dyn.loaves.forEach((l, i) => l.scale.set(1.5, .7 * (1 + .25 * ramp(t, A('fresh') + i * .15, A('fresh') + i * .15 + .4)), .9));
  } else {
    // the seesaw: him, satisfied, beside it
    P(cast.him, 301.5, 0, 2.6); cast.him.draw({ lit: -1, shade: DAYSH, rim: WARMR, expr: t > A('better') ? 'smug' : 'proud', look: -.6, blink: bl(1, A('better')), armL: [120, -20], armR: [30, 50] });
  }
  // steam from the warm things, sneeze spray
  dyn.steam.wisps.length = 0;
  if (steamOn) dyn.steam.wisps.push({ n: 70, size: .25, alpha: .5, speed: .35, path: (u, tt, i) => [dyn.potTop.x + Math.sin(u * 7 + tt * 2 + i) * .08 * (1 + u * 2), dyn.potTop.y + u * 1.0, dyn.potTop.z + Math.cos(u * 5 + tt) * .06] });
  if (dyn.hotBowl.visible && where === 'street') { const p = dyn.hotBowl.position; dyn.steam.wisps.push({ n: 40, size: .12, alpha: .55, speed: .4, path: (u, tt, i) => [p.x + Math.sin(u * 7 + tt * 2 + i) * .03 * (1 + u * 2), p.y + .1 + u * .45, p.z + Math.cos(u * 5 + tt) * .03] }); }
  dyn.steam.update(t);
  dyn.spray.wisps.length = 0;
  if (sprayOn) { const m = cast.waiter.mesh.position; dyn.spray.wisps.push({ n: 50, size: .03, alpha: .9, speed: 1.6, path: (u, tt, i) => [m.x - u * (.8 + hash(i) * .4), 1.45 - u * (.6 + hash(i, 2) * .3), m.z + (hash(i, 3) - .5) * .5 * u + .1] }); }
  dyn.spray.update(t);
  // pop-ups (screen space)
  dyn.pops = [];
  const pop = (t0, t1, text, o = {}) => { if (t >= t0 && t < t1) dyn.pops.push({ age: t - t0, left: t1 - t, text, ...o }); };
  pop(T('ten', 1) - .05, T('soup') + .1, '10 YEARS', { color: '#ffffff', ink: '#2a1a5c', size: 120 });
  pop(T('single') - .05, T('ever') - .3, '×3650', { color: '#ffd23a', ink: '#5a2a0a', size: 130 });
  pop(T('fired.') - .05, T('who', 1), 'FIRED', { color: '#ff5a5a', ink: '#5a0a1a', size: 150 });
  pop(T('fifty') - .05, T('worse') - .1, '$50 A PLATE', { color: '#3fb85a', ink: '#14401e', size: 110 });
  const proj = p => { const s = p.clone().project(cam); return { x: (s.x + 1) / 2, y: (1 - s.y) / 2 }; };
  if (where === 'street' && t > T('you') && t < T('worse')) {
    const fancy = t > A('fancy');
    for (const k of ['couple1', 'couple2']) { const m = cast[k].mesh.position, q = proj(V(m.x, 2.05, m.z)); dyn.pops.push({ age: t - (fancy ? A('fancy') : T('you')), left: T('worse') - t, kind: fancy ? 'heart' : 'stink', x: q.x, y: q.y, size: 90 }); }
  }
  // ---- look
  const focusOn = (p, coc, range) => ({ focus: cam.position.distanceTo(p), coc, range });
  let look;
  if (where === 'kitchen') look = { ...focusOn(V(200, 1.2, -1.2), 6, 2), sat: 1.15, lift: [.09, .08, .16], tint: [1.03, 1, .96] };
  else if (where === 'diagram') look = { focus: 8, coc: 0, range: 10, sat: 1.1, lift: [.1, .09, .14], tint: [1, 1, 1] };
  else {
    const inside = cam.position.z < DZ;
    if (dyn.paper.visible) look = focusOn(V(0, 1.6, -4.0), 10, 1.0);
    else if (inside && t < T('every') || t > T('wrong')) look = focusOn(V(TABLE.x, 1.2, -5.66), 7, 1.6);
    else if (t > T('soup') && t < T('bread')) look = focusOn(V(TABLE.x, .8, TABLE.z + .1), 9, .6);
    else if (inside) look = focusOn(V(TABLE.x, 1.1, -5.9), 5, 2.2);
    else if (t > T('right') && t < T('you')) look = focusOn(dyn.medallion, 6, 2);
    else look = { focus: 10, coc: 0, range: 10 };
    Object.assign(look, inside ? { sat: 1.08, lift: [.09, .1, .14], tint: [.97, 1.03, 1.0] } : { sat: 1.14, lift: [.1, .085, .15], tint: [1.03, 1.0, .97] });
  }
  Object.assign(look, { bloom: .8, vignette: .2 });
  look.blur = cp.moving > .15 ? 16 : 0;
  look.flash = (t >= T('night,') && t < T('night,') + 2 / FPS) || (t >= T('next', 1) && t < T('next', 1) + 2 / FPS) ? .3 : 0;
  return look;
}

export function overlay(g, t, ctx) {
  const { W: w, H: h } = ctx;
  for (const p of dyn.pops || []) {
    const k = backOut(Math.min(1, p.age / .2)) * Math.min(1, p.left / .12);
    if (k <= 0) continue;
    const s = (p.size || 150) * w / 1080 * k;
    g.save(); g.translate((p.x ?? .5) * w, (p.y ?? .2) * h);
    if (p.kind === 'heart') {                                   // two little hearts bobbing over a head
      for (const [dx, dy, sc] of [[-.35, 0, 1], [.4, -.35, .7]]) { const r = s * .32 * sc, x = dx * s, y = dy * s + Math.sin(t * 6 + dx) * s * .06;
        g.fillStyle = '#ff5a7a'; g.strokeStyle = PLUM; g.lineWidth = s * .05; g.beginPath(); g.moveTo(x, y + r * .9); g.bezierCurveTo(x - r * 1.6, y - r * .2, x - r * .7, y - r * 1.3, x, y - r * .4); g.bezierCurveTo(x + r * .7, y - r * 1.3, x + r * 1.6, y - r * .2, x, y + r * .9); g.fill(); g.stroke(); }
    } else if (p.kind === 'stink') {                            // three wavy green lines rising
      g.strokeStyle = '#7ac85a'; g.lineWidth = s * .07; g.lineCap = 'round';
      for (let k2 = -1; k2 <= 1; k2++) { g.beginPath(); for (let i = 0; i <= 12; i++) { const yy = -i / 12 * s * .9, xx = k2 * s * .3 + Math.sin(i * .9 + t * 8 + k2) * s * .08; i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); }
    } else {
      g.rotate(-.05); g.font = `900 ${s}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const tw = g.measureText(p.text).width + s * .7, th = s * 1.3;
      g.fillStyle = '#fff8e6'; g.strokeStyle = PLUM; g.lineWidth = s * .09; g.beginPath(); g.roundRect(-tw / 2, -th / 2, tw, th, s * .3); g.fill(); g.stroke();
      g.strokeStyle = p.ink; g.lineWidth = s * .16; g.strokeText(p.text, 0, s * .04); g.fillStyle = p.color; g.fillText(p.text, 0, s * .04);
    }
    g.restore();
  }
}
