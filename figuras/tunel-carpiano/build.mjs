// Túnel carpiano: un banco de prueba. Canal de huesos del carpo + ligamento transverso (correa),
// 9 tendones flexores (mangueras), nervio mediano (cable iluminado) y nervio cubital (fuera del túnel).
// Un manómetro con catéter mide la presión dentro del túnel; la perilla es la muñeca.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const KIT = new URL("../../.claude/skills/anatomy", import.meta.url).pathname;
const k = await import(`${KIT}/kit/iso-kit.mjs`);
const G = await import(`${KIT}/kit/lathe.mjs`);
const { tubePieces, tubeSvg } = await import(`${KIT}/kit/tube.mjs`);
const { kitScript } = await import(`${KIT}/scripts/inline-kit.mjs`);
import { MODEL_SRC } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 640, HEIGHT = 370;

// ---- mundo ----
const PLATE = { x: -122, y: -74, w: 258, d: 142, r: 9 };
const PLATE_H = 10, FOOT_H = 5;
const TX0 = -24, TX1 = 24;                 // túnel a lo largo de x (proximal → distal)
const FLOOR_TOP = 6, WALL_TOP = 22, STRAP_T = 3;
const RADIAL = { x: TX0, y: 24, w: TX1 - TX0, d: 10, r: 2.5 };
const ULNAR = { x: TX0, y: -34, w: TX1 - TX0, d: 10, r: 2.5 };
const STRAP = { x: TX0 + 2, y: -35, w: TX1 - TX0 - 4, d: 70, r: 2 };
const CUT = -8;                              // corte de la liberación, cubital al nervio
const MANI = { x: -110, y: -48, w: 18, d: 78, r: 3 };
const MANI_H = 26;
const MX = MANI.x + MANI.w;                 // cara distal del bloque proximal
const R0 = 2.3, RSW = 1.0, RN = 3.0;
const GAUGE = [2, -56], GAUGE_R = 14, GAUGE_Z = 40;
const KNOB = [-62, 52], KNOB_R = 6.5;

// Cuerdas en el corte transversal del túnel (y, z).
const NERVE = { y: 11, z: 17 };
const TENDONS = [
  { name: "FPL", y: 19, z: 10, to: "thumb", dy: 0 },
  { name: "FDP2", y: 10, z: 9.6, to: "index", dy: -2.4 },
  { name: "FDP3", y: 3, z: 9.6, to: "middle", dy: -2.4 },
  { name: "FDP4", y: -4, z: 9.6, to: "ring", dy: -2.4 },
  { name: "FDP5", y: -11, z: 9.6, to: "little", dy: -2.4 },
  { name: "FDS2", y: 4, z: 16.8, to: "index", dy: 2.4 },
  { name: "FDS3", y: -3, z: 17.2, to: "middle", dy: 2.4 },
  { name: "FDS4", y: -10, z: 17.2, to: "ring", dy: 2.4 },
  { name: "FDS5", y: -17, z: 15.8, to: "little", dy: 2.4 },
];
const FINGERS = {
  thumb: { x: 80, y: 50, h: 24 },
  index: { x: 108, y: 29, h: 32 },
  middle: { x: 114, y: 9, h: 35 },
  ring: { x: 112, y: -11, h: 32 },
  little: { x: 104, y: -31, h: 27 },
};
const POST_R = 7;
const ULNAR_NERVE = { y: -41, z: 11 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GAUGE[0], GAUGE[1] - GAUGE_R, GAUGE_Z + 8], [114, 9, 44], [-110, -48, MANI_H]],
  WIDTH, HEIGHT, { pad: 26, azimuth: 55 },
);
const V = G.viewOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth = (p) => G.dot3(p, V);
const f2 = (n) => Math.round(n * 100) / 100;
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const byDepth = (points) => [...points].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));
const tube = (pieces, tone = "hi") => pieces.map((piece) => tubeSvg(piece, { tone })).join("");

// ---- base ----
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 9, 1.6), { tone: "lo", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // regla a lo largo del borde cercano: mide la longitud del túnel
  const strip = { x: -104, y: PLATE.y + PLATE.d - 13, w: 140, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  // marcas del túnel sobre la placa
  out.push(L(k.lineOnTop([TX0, ULNAR.y + ULNAR.d + 2], [TX0, strip.y], 0, P) + k.lineOnTop([TX1, ULNAR.y + ULNAR.d + 2], [TX1, strip.y], 0, P), { tone: "faint" }));
  // placa de identificación
  const label = { x: 92, y: PLATE.y + PLATE.d - 15, w: 30, d: 9, r: 1 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.3), { tone: "mid", crease: "none" }));
  for (let i = 0; i < 3; i++) out.push(L(k.lineOnTop([label.x + 4, label.y + 2.4 + i * 2.1], [label.x + (i === 2 ? 16 : 24), label.y + 2.4 + i * 2.1], 0.8, P), { tone: "lo", free: true }));
  out.push(D([at([label.x + 1.8, label.y + 4.5, 0.8]), at([label.x + label.w - 1.8, label.y + 4.5, 0.8])], { size: 0.4 }));
  return out.join("");
}

// ---- manómetro (catéter de presión, como en las mediciones clínicas) ----
const G_MAX = 120, G_FROM = -Math.PI * 0.75, G_SPAN = Math.PI * 1.5;
function gauge() {
  const [x, y] = GAUGE;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 10, y: y - 10, w: 20, d: 20, r: 10 }, 0, 1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.cylinder(x, y, 9, 0, 3, P, 40, 0.5), { tone: "mid" }));
  out.push(D(G.dotsOf ? [0, 1, 2, 3].map((i) => at([x + Math.cos(i * Math.PI / 2 + 0.6) * 6.6, y + Math.sin(i * Math.PI / 2 + 0.6) * 6.6, 3])) : [], { size: 0.45 }));
  out.push(S(k.cylinder(x, y, 2.6, 3, GAUGE_Z - 8, P, 20), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(x, y, 2.6, 16, P, 12) + k.sideArc(x, y, 2.6, 26, P, 12), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 4.6, GAUGE_Z - 5, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, GAUGE_R, GAUGE_Z - 2, 6, P, 64, 0.7), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, GAUGE_R, GAUGE_Z + 1, GAUGE_Z + 4, 72, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, GAUGE_R, GAUGE_Z + 1, P, 40), { tone: "faint" }));
  const top = GAUGE_Z + 4;
  out.push(L(k.ring(x, y, GAUGE_R - 1.8, top, P, 64), { tone: "lo" }));
  const per = G_SPAN / 24;
  const okTicks = k.radialTicks(x, y, GAUGE_R - 2.6, 25, 5, top, [1.1, 2.4], P, G_FROM, per * 6 + 0.001);
  out.push(L(okTicks.minor, { tone: "lo" }), L(okTicks.major, { tone: "mid" }));
  // zona de riesgo: más de 30 mmHg
  const zone = Array.from({ length: 19 }, (_, i) => G_FROM + per * (6 + i));
  const tickAt = (a, r0, r1) => k.lineOnTop([x + Math.sin(a) * r0, y - Math.cos(a) * r0], [x + Math.sin(a) * r1, y - Math.cos(a) * r1], top, P);
  out.push(L(zone.map((a, i) => tickAt(a, GAUGE_R - 2.6, GAUGE_R - 2.6 - ((6 + i) % 5 === 0 ? 2.4 : 1.1))).join(""), { tone: "red" }));
  out.push(L(k.ring(x, y, 1.4, top, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 6.5], top, P, "x"), "mmHg", { size: 2.2, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const needleAt = (mmhg) => {
  const a = G_FROM + G_SPAN * Math.min(1, Math.max(0, mmhg / G_MAX));
  const [x, y] = GAUGE, r = GAUGE_R - 3.4, top = GAUGE_Z + 4.2;
  return k.lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * r, y - Math.cos(a) * r], top, P);
};

// catéter: del manómetro a la pared radial (entra al túnel)
function catheter() {
  const from = at([GAUGE[0] + 2, GAUGE[1] + 8.6, 1.5]);
  const mid = at([GAUGE[0] + 2, ULNAR.y - 4, 1.5]);
  const up = at([GAUGE[0] + 2, ULNAR.y, 12]);
  return k.wireSvg(from, up, { via: [mid], tone: "mid", size: 1 });
}

// ---- bloque proximal (antebrazo: vientres musculares) ----
function manifold() {
  const out = [`<path class="iso-halo" d="${k.haloOf(MANI, 0, MANI_H, P)}"/>`];
  out.push(S(k.slabOf(MANI, 0, MANI_H, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(MANI, 3), MANI_H, P, 3), { tone: "faint" }));
  out.push(D(k.corners(MANI, 3.5).map(([x, y]) => at([x, y, MANI_H])), { size: 0.45 }));
  // perillas tensoras: una por tendón, en la tapa
  const knobs = TENDONS.map((t) => [MANI.x + 9, t.y]).concat([[MANI.x + 9, NERVE.y]]);
  for (const [x, y] of byDepth(knobs)) {
    out.push(S(k.cylinder(x, y, 2.4, MANI_H, 2.6, P, 18), { tone: "mid" }));
    out.push(L(k.knurl(x, y, 2.4, MANI_H, MANI_H + 2.6, 14, P), { tone: "lo" }));
  }
  return out.join("");
}
// bocas en la cara distal del bloque: un collar por cuerda
function boss(y, z, r) {
  const F = G.frameAlong([MX, y, z], [1, 0, 0]);
  return S(G.disc(0, 2.4, r + 1.4, F, P), { tone: "mid" });
}

// ---- túnel ----
function floor() {
  const out = [];
  // fila distal del carpo, de radial a cubital: trapecio, trapezoide, grande, ganchoso
  const bones = [
    { y: -24, d: 11.6, h: 6.4 }, { y: -12.2, d: 11.6, h: 6 }, { y: -0.4, d: 12.6, h: 5.6 }, { y: 12.4, d: 11.6, h: 6.2 },
  ];
  for (const b of bones) {
    const plan = { x: TX0, y: b.y, w: TX1 - TX0, d: b.d, r: 2.2 };
    out.push(S(k.slabOf(plan, 0, b.h, P, 4, 0.6), { tone: "mid" }));
  }
  return out.join("");
}
function wall(plan, side) {
  const out = [];
  const lower = plan, upper = k.insetPlan(plan, 1);
  out.push(S(k.slabOf(lower, 0, 14, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf(upper, 14, WALL_TOP - 14, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(upper, 2.5), WALL_TOP, P, 3), { tone: "faint" }));
  return out.join("");
}
function strapScrews(plan, y) {
  const z = WALL_TOP + STRAP_T;
  const xs = [-14, 0, 14];
  return L(xs.map((x) => k.ring(x, y, 1.8, z, P, 14)).join(""), { tone: "lo" }) + D(xs.map((x) => at([x, y, z])), { size: 0.5, tone: "hi" });
}
function strapPiece(plan, screwsY) {
  const out = [];
  out.push(S(k.slabOf(plan, WALL_TOP, STRAP_T, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  // fibras transversas del ligamento (de borde a borde)
  for (let x = plan.x + 3.5; x < plan.x + plan.w - 2; x += 3.6) {
    out.push(L(k.lineOnTop([x, plan.y + 0.6], [x, plan.y + plan.d - 0.6], WALL_TOP + STRAP_T, P), { tone: "faint" }));
  }
  for (const y of screwsY) out.push(strapScrews(plan, y));
  return out.join("");
}

// ---- dedos ----
function post(name) {
  const f = FINGERS[name];
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: f.x - POST_R, y: f.y - POST_R, w: POST_R * 2, d: POST_R * 2, r: POST_R }, 0, 1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.cylinder(f.x, f.y, POST_R + 2, 0, 2.4, P, 40, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(f.x, f.y, POST_R, 2.4, f.h - 2.4, P, 40), { tone: "mid", crease: "none" }));
  // articulaciones (MCF, IFP, IFD) como bandas
  const joints = name === "thumb" ? [0.42, 0.75] : [0.32, 0.62, 0.84];
  out.push(L(joints.map((j) => k.sideArc(f.x, f.y, POST_R, 2.4 + (f.h - 2.4) * j, P, 28)).join(""), { tone: "lo" }));
  out.push(S(k.cylinder(f.x, f.y, POST_R - 1.2, f.h, 1.4, P, 32), { tone: "mid" }));
  return out.join("");
}
function lamp(name, part) {
  const f = FINGERS[name];
  const z = f.h + 1.4;
  const cx = part === "radial" ? f.x - 1.6 : part === "ulnar" ? f.x + 1.6 : f.x;
  const cy = part === "radial" ? f.y + 2.3 : part === "ulnar" ? f.y - 2.3 : f.y;
  const r = part ? 2.4 : 3.4;
  return `<g data-lamp="${name}${part ? "-" + part : ""}">${S(G.sphereOf([cx, cy, z + r * 0.55], r, P, { steps: 32 }), { tone: "hi", lit: true })}</g>`;
}
const lampTop = (name, part) => {
  const f = FINGERS[name];
  const r = part ? 2.4 : 3.4;
  const cx = part === "radial" ? f.x - 1.6 : part === "ulnar" ? f.x + 1.6 : f.x;
  const cy = part === "radial" ? f.y + 2.3 : part === "ulnar" ? f.y - 2.3 : f.y;
  return [cx, cy, f.h + 1.4 + r * 0.55];
};

// ---- cuerdas ----
const SPLIT = 42; // donde termina la vaina y empieza el abanico
const MID0 = -62;
const tendonR = (s) => (x) => R0 + RSW * s * smoothstep(MID0 + 2, -46, x) * (1 - smoothstep(26, SPLIT - 4, x));
const nerveR = (c) => (x) => RN + c * (1.0 * Math.exp(-(((x + 36) / 7) ** 2)) - 1.25 * smoothstep(-24, -16, x) * (1 - smoothstep(16, 24, x)));
const radiusOn = (fn, x0, x1) => (t) => fn(x0 + (x1 - x0) * t);

function midPieces(y, z, fn) {
  return tubePieces([[MID0, y, z], [SPLIT, y, z]], radiusOn(fn, MID0, SPLIT), P, { maxLength: 400, breaks: [TX0 - MID0, TX1 - MID0], caps: false });
}
const section = (pieces) => ({
  prox: pieces.filter((p) => p.mid[0] < TX0),
  inside: pieces.filter((p) => p.mid[0] >= TX0 && p.mid[0] <= TX1),
  dist: pieces.filter((p) => p.mid[0] > TX1),
});

// las cuerdas son paralelas a x: su orden de profundidad es constante
const cords = [...TENDONS.map((t) => ({ ...t, kind: "tendon" })), { name: "MED", y: NERVE.y, z: NERVE.z, kind: "nerve" }]
  .sort((a, b) => depth([0, a.y, a.z]) - depth([0, b.y, b.z]));

const LEVELS_S = 6, LEVELS_C = 9;
// por cuerda y sección: un grupo por nivel (hinchazón o compresión); el código vivo muestra uno
const levels = {};
for (const c of cords) {
  const n = c.kind === "tendon" ? LEVELS_S : LEVELS_C;
  const out = { prox: [], inside: [], dist: [] };
  for (let i = 0; i < n; i++) {
    const v = i / (n - 1);
    const sec = section(midPieces(c.y, c.z, c.kind === "tendon" ? tendonR(v) : nerveR(v)));
    const tone = c.kind === "nerve" ? "lit" : "hi";
    for (const key of ["prox", "inside", "dist"]) out[key].push(`<g data-${c.kind}="${i}"${i ? ' display="none"' : ""}${c.kind === "nerve" ? ' class="nerve"' : ""}>${tube(sec[key], tone)}</g>`);
  }
  levels[c.name] = out;
}
const orderedCords = (key) => cords.map((c) => levels[c.name][key].join("")).join("");

function staticProx() {
  const out = [];
  for (const c of cords) {
    const r = c.kind === "nerve" ? RN : R0;
    const svgT = tube(tubePieces([[MX + 2.4, c.y, c.z], [MID0, c.y, c.z]], r, P, { maxLength: 40, caps: [false, false] }), c.kind === "nerve" ? "lit" : "hi");
    out.push(c.kind === "nerve" ? `<g class="nerve">${svgT}</g>` : svgT);
  }
  return out.join("");
}

// abanico distal: estático (fuera de la vaina sinovial)
function fanItems() {
  const items = [];
  for (const t of TENDONS) {
    const f = FINGERS[t.to];
    const ty = f.y + t.dy;
    const end = f.x - Math.sqrt(POST_R * POST_R - t.dy * t.dy) + 0.6;
    const route = G.fillet([[SPLIT, t.y, t.z], [SPLIT + 6, t.y, t.z], [end - 12, ty, t.z], [end, ty, t.z]], 9, 7, { P, tube: R0 });
    for (const piece of tubePieces(route, R0, P, { maxLength: 7, caps: [false, true] })) items.push({ key: depth(piece.mid), svg: tubeSvg(piece, { tone: "hi" }) });
  }
  // nervio mediano hasta el divisor (nervios digitales comunes)
  for (const piece of tubePieces([[SPLIT, NERVE.y, NERVE.z], [SPLITTER.x - 0.2, NERVE.y, NERVE.z]], RN, P, { maxLength: 7, caps: [false, false] })) {
    items.push({ key: depth(piece.mid), svg: `<g class="nerve">${tubeSvg(piece, { tone: "lit" })}</g>` });
  }
  // divisor
  items.push({ key: depth([SPLITTER.x + 4, NERVE.y, 10]) - 2, svg: splitter() });
  items.push(...branchItems());
  // ningún tubo pasa por delante de un dedo: los dedos van después de todos los tubos
  for (const name of Object.keys(FINGERS)) items.push({ key: 1e4 + depth([FINGERS[name].x, FINGERS[name].y, 0]), svg: post(name) });
  return items;
}
const SPLITTER = { x: 50, y: NERVE.y - 5, w: 8, d: 12, r: 2 };
function splitter() {
  const out = [];
  out.push(S(k.slabOf({ ...SPLITTER, y: SPLITTER.y }, 0, 8, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(SPLITTER, 0.6), 8, NERVE.z + 7.5 - 8, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([SPLITTER.x + SPLITTER.w / 2, SPLITTER.y + 2.4, NERVE.z + 7.5]), at([SPLITTER.x + SPLITTER.w / 2, SPLITTER.y + SPLITTER.d - 2.4, NERVE.z + 7.5])], { size: 0.45 }));
  return out.join("");
}
const SPLIT_OUT = [SPLITTER.x + SPLITTER.w / 2, SPLITTER.y + SPLITTER.d / 2, NERVE.z + 4.6];

// nervio cubital: fuera del túnel, pasa por el canal de Guyon (un puente sobre la pared cubital)
const GUYON = { x: -7, w: 14 };
function ulnarNerve() {
  const { y, z } = ULNAR_NERVE;
  const f = FINGERS.little;
  const endX = f.x;
  const route = G.fillet([[MX + 2.4, y, z], [f.x - 14, y, z], [f.x - 2, f.y - POST_R - 6, z], [f.x, f.y - POST_R + 0.6, z]], 6, 7, { P, tube: 2.4 });
  const gaps = [[GUYON.x - (MX + 2.4), GUYON.x + GUYON.w - (MX + 2.4)]];
  const pieces = tubePieces(route, 2.4, P, { maxLength: 12, gaps, caps: [false, true] });
  return { pieces, guyon: guyonBridge() };
}
function guyonBridge() {
  const { y, z } = ULNAR_NERVE;
  const out = [];
  // dos pilares sobre la placa y un puente (ligamento volar del carpo)
  for (const py of [y - 4.4, y + 4.4]) out.push(S(k.slabOf({ x: GUYON.x, y: py - 1.2, w: GUYON.w, d: 2.4, r: 0.6 }, 0, z + 3.6, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: GUYON.x, y: y - 5.6, w: GUYON.w, d: 11.2, r: 1 }, z + 3.6, 2, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([GUYON.x + 2.4, y - 4.4, z + 5.6]), at([GUYON.x + GUYON.w - 2.4, y + 4.4, z + 5.6])], { size: 0.45 }));
  return out.join("");
}

// ---- perilla de la muñeca ----
const K_FROM = -Math.PI / 3, K_SPAN = (Math.PI * 2) / 3;
function knob() {
  const [x, y] = KNOB;
  const out = [];
  const t = k.radialTicks(x, y, KNOB_R + 4.2, 13, 6, 0, [1.4, 2.8], P, K_FROM, K_SPAN + 0.001);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, KNOB_R + 4.2, 0, P, 48), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, KNOB_R + 1.4, 0, 1.6, P, 40), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, KNOB_R, 1.6, 5, P, 40, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(x, y, KNOB_R, 1.8, 6.4, 40, P), { tone: "lo" }));
  return out.join("");
}
const knobPointer = (f) => {
  const a = K_FROM + K_SPAN * (f + 1) / 2;
  const [x, y] = KNOB;
  return k.lineOnTop([x, y], [x + Math.sin(a) * (KNOB_R - 1), y - Math.cos(a) * (KNOB_R - 1)], 6.6, P);
};

// ---- glows de las lámparas ----
const LAMPS = [["thumb"], ["index"], ["middle"], ["ring", "radial"], ["ring", "ulnar"], ["little"]];
function glows() {
  return LAMPS.map(([name, part]) => {
    const [sx, sy] = at(lampTop(name, part));
    const id = name + (part ? "-" + part : "");
    return `<circle class="glow" data-glow="${id}" cx="${f2(sx)}" cy="${f2(sy)}" r="${part ? 8 : 11}" fill="url(#lampGlow)"/>`;
  }).join("");
}
function branches() { return ""; }
// nervios digitales: ramas finas del divisor a la cara radial de cada dedo
function branchItems() {
  const items = [];
  const z = 21.5, r = 1.1;
  const to = [["thumb", 0], ["index", 0], ["middle", 0], ["ring", 3.2]];
  to.forEach(([n, side], i) => {
    const f = FINGERS[n];
    const startY = SPLITTER.y + 2 + i * 2;
    const end = f.x - Math.sqrt(POST_R * POST_R - side * side) + 0.4;
    const route = G.fillet([[SPLITTER.x + SPLITTER.w, startY, z], [SPLITTER.x + SPLITTER.w + 4, startY, z], [end - 9, f.y + side, z], [end, f.y + side, z]], 6, 7, { P, tube: r });
    for (const piece of tubePieces(route, r, P, { maxLength: 8, caps: [false, true] })) {
      items.push({ key: depth(piece.mid), svg: `<g class="nerve" data-branch="median">${tubeSvg(piece, { tone: "lit" })}</g>` });
    }
  });
  return items;
}

// ---- ensamblado (de atrás hacia adelante) ----

const strapClosed = `<g data-part="strap">${strapPiece(STRAP, [-29, 29])}</g>`;
const halfA = { ...STRAP, d: CUT - STRAP.y - 0.3 };
const halfB = { ...STRAP, y: CUT + 0.3, d: STRAP.y + STRAP.d - CUT - 0.3 };
const strapOpen = `<g data-part="strap-open" display="none"><g data-half="a">${strapPiece(halfA, [-29])}</g><g data-half="b">${strapPiece(halfB, [29])}</g></g>`;
const ulnar = ulnarNerve();
const fan = fanItems().sort((a, b) => a.key - b.key).map((i) => i.svg).join("");

const defs = `<defs><radialGradient id="lampGlow"><stop offset="0" stop-color="var(--lamp)" stop-opacity=".95"/><stop offset=".35" stop-color="var(--lamp)" stop-opacity=".45"/><stop offset="1" stop-color="var(--lamp)" stop-opacity="0"/></radialGradient></defs>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Un banco de prueba que reproduce el túnel carpiano: un canal de huesos del carpo cerrado por el ligamento transverso, con nueve tendones flexores y el nervio mediano adentro. Un manómetro mide la presión dentro del túnel y cinco dedos con luces muestran la sensibilidad del pulgar, índice, medio y mitad del anular. El nervio cubital pasa por fuera, por el canal de Guyon, hacia el meñique.",
  body: [
    defs,
    base(),
    gauge(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(2.5)}" style="stroke-width:1"/>`,
    catheter(),
    manifold(),
    cords.map((c) => boss(c.y, c.z, c.kind === "nerve" ? RN : R0)).join(""),
    staticProx(),
    orderedCords("prox"),
    `<g class="nerve nerve-u">${tube(ulnar.pieces.filter((p) => p.mid[0] < GUYON.x), "mid")}</g>`,
    ulnar.guyon,
    `<g class="nerve nerve-u">${tube(ulnar.pieces.filter((p) => p.mid[0] > GUYON.x), "mid")}</g>`,
    wall(ULNAR, "ulnar"),
    floor(),
    orderedCords("inside"),
    wall(RADIAL, "radial"),
    strapClosed,
    strapOpen,
    orderedCords("dist"),
    fan,
    knob(),
    `<path data-part="knob" class="iso-line" data-tone="lit" data-free="end" d="${knobPointer(0)}" style="stroke-width:1.1"/>`,
    branches(),
    LAMPS.map(([n, p]) => lamp(n, p)).join(""),
    `<g class="glows">${glows()}</g>`,
  ],
});

const DATA = {
  P, LEVELS_S, LEVELS_C, GAUGE, GAUGE_R, GAUGE_Z, G_MAX, G_FROM, G_SPAN, KNOB, KNOB_R, K_FROM, K_SPAN,
  strapA: k.translateAlong(P, [0, -5, 2.5]), strapB: k.translateAlong(P, [0, 5, 2.5]),
  shiftA: k.axisVector(P, [0, -5, 2.5]), shiftB: k.axisVector(P, [0, 5, 2.5]),
};

const live = `
${MODEL_SRC}
const D = ${JSON.stringify(DATA)};
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (s) => svg.querySelector(s);
const $$ = (s) => [...svg.querySelectorAll(s)];
const needle = $('[data-part="needle"]'), pointer = $('[data-part="knob"]');
const strap = $('[data-part="strap"]'), strapOpen = $('[data-part="strap-open"]');
const halfA = $('[data-half="a"]'), halfB = $('[data-half="b"]');
const tendonG = [...Array(D.LEVELS_S)].map((_, i) => $$('[data-tendon="' + i + '"]'));
const nerveG = [...Array(D.LEVELS_C)].map((_, i) => $$('[data-nerve="' + i + '"]'));
const glow = Object.fromEntries($$("[data-glow]").map((g) => [g.dataset.glow, g]));
const branchG = $$('[data-branch="median"]');
const readout = document.querySelector("[data-readout]");
const btnSwell = document.querySelector("[data-act=swell]"), btnRelease = document.querySelector("[data-act=release]"), btnReset = document.querySelector("[data-act=reset]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const needleAt = (mmhg) => { const a = D.G_FROM + D.G_SPAN * clamp(mmhg / D.G_MAX, 0, 1); const [x, y] = D.GAUGE, r = D.GAUGE_R - 3.4, top = D.GAUGE_Z + 4.2; return lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * r, y - Math.cos(a) * r], top, P); };
const knobAt = (f) => { const a = D.K_FROM + D.K_SPAN * (f + 1) / 2; const [x, y] = D.KNOB; return lineOnTop([x, y], [x + Math.sin(a) * (D.KNOB_R - 1), y - Math.cos(a) * (D.KNOB_R - 1)], 6.6, P); };

const st = { f: 0, fT: 0, s: 0, sT: 0, rel: 0, relT: 0, p: 2.5, rate: 0, shownT: -1, shownN: -1, open: false };
let frame = 0, last = 0, clock = 0, touring = true, visible = false, idle = 0, t0 = performance.now();
const TOUR = [0, 1, 0, -1];
function show(groups, i, prev) { if (i === prev) return i; groups.forEach((g, j) => g.forEach((el) => el.setAttribute("display", j === i ? "inline" : "none"))); return i; }
function draw(now) {
  st.shownT = show(tendonG, Math.round(st.s * (D.LEVELS_S - 1)), st.shownT);
  const c = compressionOf(st.p);
  st.shownN = show(nerveG, Math.round(c * (D.LEVELS_C - 1)), st.shownN);
  needle.setAttribute("d", needleAt(st.p));
  pointer.setAttribute("d", knobAt(st.f));
  const open = st.rel > 0.002;
  if (open !== st.open) { st.open = open; strap.setAttribute("display", open ? "none" : "inline"); strapOpen.setAttribute("display", open ? "inline" : "none"); }
  if (open) {
    halfA.setAttribute("transform", "translate(" + (D.shiftA[0] * st.rel).toFixed(2) + " " + (D.shiftA[1] * st.rel).toFixed(2) + ")");
    halfB.setAttribute("transform", "translate(" + (D.shiftB[0] * st.rel).toFixed(2) + " " + (D.shiftB[1] * st.rel).toFixed(2) + ")");
  }
  const sig = signalOf(st.p);
  const flick = sig.tingle && !still.matches ? 0.5 + 0.5 * Math.sin(now / 90) * Math.sin(now / 37 + 1.3) : 0;
  const median = clamp(sig.level - sig.tingle * 0.35 * flick, 0.04, 1);
  for (const id of ["thumb", "index", "middle", "ring-radial"]) glow[id].setAttribute("opacity", median.toFixed(3));
  for (const id of ["little", "ring-ulnar"]) glow[id].setAttribute("opacity", "1");
  
  const text = Math.round(st.p) + " mmHg · " + postureOf(st.f) + " · " + sig.label;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(st.f * 60)));
  stage.setAttribute("aria-valuetext", "Muñeca " + postureOf(st.f) + ", " + text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; st.fT = TOUR[Math.floor(clock / 2.6) % TOUR.length]; }
  const ease = (v, t, sec) => calm ? t : v + (t - v) * (1 - Math.exp(-dt / sec));
  st.f = ease(st.f, st.fT, 0.35); st.s = ease(st.s, st.sT, 0.6); st.rel = ease(st.rel, st.relT, 0.25);
  for (const key of ["f", "s", "rel"]) if (Math.abs(st[key] - st[key + "T"]) < 0.002) st[key] = st[key + "T"];
  // la aguja sigue la presión con un resorte amortiguado
  const want = pressureOf(st.f, st.s, st.rel);
  if (calm) { st.p = want; st.rate = 0; }
  else for (let i = 0; i < 4; i++) { st.rate += ((want - st.p) * 160 - st.rate * 22) * dt / 4; st.p += st.rate * dt / 4; }
  draw(now);
  const sig = signalOf(st.p);
  const settled = !touring && !sig.tingle && st.f === st.fT && st.s === st.sT && st.rel === st.relT && Math.abs(want - st.p) < 0.01 && Math.abs(st.rate) < 0.01;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const hold = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4200); run(); };
const steer = (f) => { st.fT = clamp(f, -1, 1); hold(); };
function setSwell(on) { st.sT = on ? 1 : 0; btnSwell.setAttribute("aria-pressed", String(on)); run(); }
function setRelease(on) { st.relT = on ? 1 : 0; btnRelease.setAttribute("aria-pressed", String(on)); run(); }
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (e) => { const b = svg.getBoundingClientRect(); steer((((e.clientX - b.left) / b.width) - 0.5) / 0.32); });
stage.addEventListener("pointerleave", () => hold());
stage.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "ArrowUp") steer(Math.round(st.fT * 6 + 1) / 6);
  else if (e.key === "ArrowLeft" || e.key === "ArrowDown") steer(Math.round(st.fT * 6 - 1) / 6);
  else if (e.key === "Home") steer(0);
  else if (e.key === "s" || e.key === "S") { setSwell(st.sT < 0.5); hold(); }
  else if (e.key === "l" || e.key === "L") { setRelease(st.relT < 0.5); hold(); }
  else return;
  e.preventDefault();
});
btnSwell.addEventListener("click", () => { setSwell(st.sT < 0.5); hold(); });
btnRelease.addEventListener("click", () => { setRelease(st.relT < 0.5); hold(); });
btnReset.addEventListener("click", () => { setSwell(false); setRelease(false); steer(0); });
window.__anatomy = { st, setSwell, setRelease, steer, stopTour: () => { touring = false; clearTimeout(idle); } };
draw(performance.now());
`;

const css = `<style>
.iso{--lamp:#ffb347;--nerve:#4a3a14;--nerve-hi:#6b5520;--nerve-lo:#33280d}
.iso[data-theme="light"]{--lamp:#ff9a1f;--nerve:#fbe7a6;--nerve-hi:#fff6d6;--nerve-lo:#efd07a}
.glow{mix-blend-mode:screen;pointer-events:none}
.nerve .tb-body{fill:var(--nerve)}
.nerve .tb-shine{fill:var(--nerve-hi)}
.nerve .tb-shade{fill:var(--nerve-lo)}
.iso[data-theme="light"] .glow{mix-blend-mode:multiply}
.tn-controls{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;padding:0 16px 14px}
.tn-controls button{font:12px/1 var(--anatomy-mono);color:var(--anatomy-text);background:var(--anatomy-card);border:0;border-radius:7px;padding:9px 12px;box-shadow:var(--anatomy-lift);cursor:pointer}
.tn-controls button[aria-pressed="true"]{color:var(--anatomy-strong);box-shadow:var(--anatomy-lift),inset 0 0 0 1px var(--anatomy-mid)}
.tn-controls button:focus-visible{outline:2px solid var(--anatomy-mid);outline-offset:2px}
</style>`;

const body = css + k.plateHtml({
  fig: "Fig 1",
  title: "Túnel carpiano",
  hint: "Puntero o ← →: la muñeca",
  readout: "3 mmHg · neutra · nervio normal",
  keys: [
    { mark: "lit", label: "Nervio mediano: lleva la sensibilidad del pulgar, índice, medio y mitad del anular" },
    { mark: "raised", label: "Nueve tendones flexores y el ligamento transverso del carpo, que cierra el túnel" },
    { mark: "red", label: "Más de 30 mmHg: el nervio empieza a sufrir" },
  ],
  caption:
    "El túnel carpiano es un canal rígido: los huesos del carpo forman el piso y las paredes, y el ligamento transverso el techo. Por adentro pasan nueve tendones y el nervio mediano. Si los tendones se inflaman, o la muñeca se flexiona o extiende mucho, la presión sube porque el espacio no puede agrandarse. En una muñeca sana en reposo es de unos 2,5 mmHg; en el síndrome del túnel carpiano ronda 32 mmHg y llega a 90–110 con la muñeca doblada. Por encima de 30 mmHg se altera la circulación del nervio (hormigueo) y por encima de 50 se bloquea la conducción (adormecimiento). El meñique no cambia: lo inerva el nervio cubital, que pasa por fuera del túnel. La cirugía corta el ligamento, el túnel se agranda y la presión baja. Valores aproximados de estudios clásicos (Gelberman 1981; Lundborg 1982).",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Túnel carpiano: flechas para flexionar o extender la muñeca, S para inflamar los tendones, L para liberar el ligamento" aria-valuemin="-60" aria-valuemax="60" aria-valuenow="0">${svg}</div>
<div class="tn-controls"><button type="button" data-act="swell" aria-pressed="false">Inflamar tendones · S</button><button type="button" data-act="release" aria-pressed="false">Liberar ligamento · L</button><button type="button" data-act="reset">Reiniciar</button></div>`,
});

const name = theme === "light" ? "tunel-carpiano-light.html" : "tunel-carpiano.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "Túnel carpiano", theme, body, script: kitScript() + live }));
console.log("wrote", name);
