// TFCC en pronosupinación: un banco giratorio visto en corte axial (z = hacia distal).
// El cúbito es fijo; el radio gira a su alrededor sobre una plataforma, con su escotadura sigmoidea
// abrazando la cabeza cubital. El disco y los cuatro haces radiocubitales (dorsal/palmar, superficial a la
// estiloides y profundo a la fóvea) se estiran o aflojan según la geometría real del giro.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const KIT = new URL("../../.claude/skills/anatomy", import.meta.url).pathname;
const k = await import(`${KIT}/kit/iso-kit.mjs`);
const { kitScript } = await import(`${KIT}/scripts/inline-kit.mjs`);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const WIDTH = 640, HEIGHT = 400;

// Ejes del piso: +x hacia radial, +y hacia dorsal, z hacia distal. El cúbito está en el origen.
const PLATE = { x: -88, y: -88, w: 176, d: 176, r: 12 };
const PLATE_H = 10, FOOT_H = 5;
const TT_R = 72, TT_Z = 0, TT_H = 8;          // plataforma giratoria
const HEAD_R = 32, HEAD_Z0 = 28, H = 46;       // cabeza cubital
const PED_R = 17;                              // diáfisis cubital
const STY = { a: (160 * Math.PI) / 180, r: 26, top: H + 13, rad: 4 };   // estiloides: dorsal-cubital
const FOV = [0, 0];                            // fóvea: sobre el eje de rotación
const ECU = { a: (174 * Math.PI) / 180, r: 39, rad: 4.8 };
const NOTCH_R = 38, NOTCH_A = (47 * Math.PI) / 180;  // escotadura sigmoidea (más ancha que la cabeza)
const RAD_Z0 = TT_H + 2, RAD_X1 = 70, RAD_Y = 36;
const SHIFT = 4.5;                             // la cabeza cubital se desplaza en la escotadura (ilustrativo)
const ROM = 80;                                // grados de pronación / supinación

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, STY.top + 4], [RAD_X1, RAD_Y, H], [-RAD_Y, RAD_X1, H], [-RAD_Y, -RAD_X1, H]],
  WIDTH, HEIGHT, { pad: 18, azimuth: 40, elevation: 50 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const polar = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  const feet = k.corners(PLATE, 22).sort((a, b) => k.depthOf([...a, 0], P) - k.depthOf([...b, 0], P));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 10, 1.6), { tone: "lo", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // transportador: de 80° de supinación a 80° de pronación, alrededor de la plataforma
  const R0 = TT_R + 3, from = -ROM, to = ROM;
  const minor = [], major = [];
  for (let d = from; d <= to; d += 5) {
    const a = (-d * Math.PI) / 180;               // pronación gira en sentido horario visto desde distal
    const len = d % 15 === 0 ? 5 : 2.6;
    (d % 15 === 0 ? major : minor).push(k.lineOnTop(polar(a, R0), polar(a, R0 + len), 0, P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  out.push(L(k.lineOnTop(polar(0, R0), polar(0, R0 + 5), 0, P), { tone: "hi" }));
  const arc = []; for (let d = from; d <= to; d += 2) arc.push(polar((-d * Math.PI) / 180, R0));
  out.push(L(k.onTop(arc, 0, P), { tone: "lo" }));
  const outer = []; for (let d = from; d <= to; d += 2) outer.push(polar((-d * Math.PI) / 180, R0 + 5));
  out.push(L(k.onTop(outer, 0, P), { tone: "faint" }));
  out.push(L(k.lineOnTop(polar((-from * Math.PI) / 180, R0), polar((-from * Math.PI) / 180, R0 + 5), 0, P) + k.lineOnTop(polar((-to * Math.PI) / 180, R0), polar((-to * Math.PI) / 180, R0 + 5), 0, P), { tone: "faint" }));
  return out.join("");
}

function turntable() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -TT_R, y: -TT_R, w: TT_R * 2, d: TT_R * 2, r: TT_R }, TT_Z, TT_H, P)}" style="filter:blur(5px)"/>`];
  out.push(S(k.cylinder(0, 0, TT_R, TT_Z, TT_H, P, 112, 1), { tone: "mid" }));
  out.push(L(k.ring(0, 0, TT_R - 6, TT_H, P, 112), { tone: "faint" }));
  out.push(L(k.ring(0, 0, PED_R + 6, TT_H, P, 48), { tone: "lo" }));
  return out.join("");
}

// cúbito fijo: diáfisis, cabeza, fóvea, estiloides y ECU en su surco con la subvaina
function ulnaBack() {
  const out = [];
  const [ex, ey] = polar(ECU.a, ECU.r);
  out.push(S(k.cylinder(0, 0, PED_R + 4, TT_H, 3, P, 48), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, PED_R, TT_H + 3, HEAD_Z0 - TT_H - 3, P, 48), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(0, 0, PED_R, 22, P, 32), { tone: "faint" }));
  out.push(S(k.cylinder(0, 0, HEAD_R, HEAD_Z0, H - HEAD_Z0, P, 72, 1.2), { tone: "hi", crease: "lo" }));
  out.push(L(k.sideArc(0, 0, HEAD_R, HEAD_Z0 + 5, P, 48), { tone: "faint" }));
  // ECU: tendón vertical en su surco, del lado dorsal-cubital
  out.push(S(k.cylinder(ex, ey, ECU.rad, TT_H + 4, H + 16 - TT_H - 4, P, 28), { tone: "mid", crease: "none", className: "ecu" }));
  out.push(S(k.cylinder(ex, ey, ECU.rad + 1.6, H - 12, 8, P, 28, 0.4), { tone: "mid", className: "ecu-sheath" }));
  return out.join("");
}
function ulnaTop() {
  const out = [];
  const [sx, sy] = polar(STY.a, STY.r);
  out.push(L(k.ring(FOV[0], FOV[1], 3.4, H, P, 24), { tone: "mid" }));
  out.push(D([at([FOV[0], FOV[1], H])], { size: 0.7, tone: "hi" }));
  out.push(S(k.cylinder(sx, sy, STY.rad + 1.4, H, 2, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(sx, sy, STY.rad, H + 2, STY.top - H - 4, P, 24), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(sx, sy, STY.rad - 1.2, STY.top - 2, 2, P, 24), { tone: "hi" }));
  return out.join("");
}

const DATA = { P, NOTCH_R, NOTCH_A, RAD_Z0, RAD_X1, RAD_Y, H, SHIFT, ROM, STY: [...polar(STY.a, STY.r), H + 3], STY_RAD: STY.rad, FOV: [...FOV, H + 0.4], TT_R, TT_H, HEAD_R };

const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (s) => svg.querySelector(s);
const back = $("[data-part=radius-back]"), front = $("[data-part=radius-front]"), top = $("[data-part=tfcc]"), mark = $("[data-part=mark]");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rad = (d) => d * Math.PI / 180;
const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];

// Pose del radio para una pronación de deg grados (negativo = supinación).
// Pronación gira el radio en sentido horario visto desde distal y la cabeza cubital queda más dorsal.
function pose(deg) {
  const a = rad(-deg), t = -D.SHIFT * deg / D.ROM;
  return (p) => rot([p[0], p[1] + t], a);
}
const NOTCH = [];
for (let i = 0; i <= 16; i++) { const a = D.NOTCH_A - (2 * D.NOTCH_A * i) / 16; NOTCH.push([Math.cos(a) * D.NOTCH_R, Math.sin(a) * D.NOTCH_R]); }
const RIM_D = NOTCH[0], RIM_P = NOTCH[16];
const RADIUS_PLAN = [...NOTCH, [D.NOTCH_R * Math.cos(D.NOTCH_A) + 8, -D.RAD_Y], [D.RAD_X1 - 10, -D.RAD_Y], [D.RAD_X1, -D.RAD_Y + 12], [D.RAD_X1, D.RAD_Y - 12], [D.RAD_X1 - 10, D.RAD_Y], [D.NOTCH_R * Math.cos(D.NOTCH_A) + 8, D.RAD_Y]];
const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Los cuatro haces: radial fijo en el borde de la escotadura, cubital en la estiloides o la fóvea.
const LIGS = [
  { id: "ds", name: "dorsal superficial", from: NOTCH[0], to: "sty" },
  { id: "dd", name: "dorsal profundo", from: NOTCH[2], to: "fov" },
  { id: "ps", name: "palmar superficial", from: NOTCH[16], to: "sty" },
  { id: "pd", name: "palmar profundo", from: NOTCH[14], to: "fov" },
];
function geometry(deg) {
  const f = pose(deg);
  return LIGS.map((l) => {
    const a = f([l.from[0] - 1, l.from[1]]), b = l.to === "sty" ? D.STY : D.FOV;
    return { ...l, a, b, L: len(a, b) };
  });
}
const REST = geometry(0);
// Tensión según el modelo de Hagert (cualitativo): en pronación dorsal superficial y palmar profundo,
// en supinación palmar superficial y dorsal profundo. 0 = en reposo, 1 = máxima.
const PRO = { ds: 1, pd: 1, ps: 0, dd: 0 };
function strainOf(deg) { return geometry(deg).map((g) => ({ ...g, e: Math.max(0, (PRO[g.id] ? deg : -deg) / D.ROM) })); }
const TIGHT = 0.12;

function radiusSvg(f) {
  const ring = RADIUS_PLAN.map(f);
  const body = solidSvg(extrude(ring, D.RAD_Z0, D.H - D.RAD_Z0, P, { convex: false, bevel: 0.8 }), { tone: "mid" });
  // superficie articular (cartílago) y tubérculo de Lister
  const cart = solidSvg(extrude(RADIUS_PLAN.slice(0, 17).concat([[D.NOTCH_R * Math.cos(D.NOTCH_A) + 4, -D.RAD_Y + 3], [D.RAD_X1 - 12, -D.RAD_Y + 3], [D.RAD_X1 - 4, -D.RAD_Y + 12], [D.RAD_X1 - 4, D.RAD_Y - 12], [D.RAD_X1 - 12, D.RAD_Y - 3], [D.NOTCH_R * Math.cos(D.NOTCH_A) + 4, D.RAD_Y - 3]]).map(f), D.H, 0.01, P, { convex: false }), { tone: "lo", crease: "none", flat: true });
  const lister = f([D.RAD_X1 * 0.6, D.RAD_Y]);
  const ls = solidSvg(extrude([[D.RAD_X1 * 0.6 - 6, D.RAD_Y - 1], [D.RAD_X1 * 0.6 + 6, D.RAD_Y - 1], [D.RAD_X1 * 0.6 + 4, D.RAD_Y + 4], [D.RAD_X1 * 0.6 - 4, D.RAD_Y + 4]].map(f), D.RAD_Z0 + 12, D.H - D.RAD_Z0 - 18, P), { tone: "mid" });
  const seam = lineSvg(onTop(RADIUS_PLAN.slice(0, 17).map(f), D.H, P), { tone: "faint" });
  // carro: dos tornillos al pie, sobre la plataforma
  const screws = [[D.RAD_X1 - 10, -D.RAD_Y + 8], [D.RAD_X1 - 10, D.RAD_Y - 8]].map(f).map((p) => iso([p[0], p[1], D.H], P));
  return body + cart + seam + dotsSvg(screws, { size: 0.5 });
}
// Un haz superficial no cruza el centro de la articulación: rodea la cabeza cubital (círculo de radio w).
function wrapPts(a, b, w) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy)));
  if (Math.hypot(a[0] + dx * t, a[1] + dy * t) >= w || Math.hypot(...a) <= w || Math.hypot(...b) <= w) return [a, b];
  const ang = (p) => Math.atan2(p[1], p[0]);
  const al = Math.acos(w / Math.hypot(...a)), bl = Math.acos(w / Math.hypot(...b));
  let best = null;
  for (const dir of [1, -1]) for (const sa of [1, -1]) for (const sb of [1, -1]) {
    const t0 = ang(a) + sa * al, t1 = ang(b) + sb * bl;
    let sweep = t1 - t0; while (sweep * dir < 0) sweep += dir * 2 * Math.PI; while (Math.abs(sweep) > 2 * Math.PI) sweep -= dir * 2 * Math.PI;
    const T0 = [Math.cos(t0) * w, Math.sin(t0) * w], T1 = [Math.cos(t1) * w, Math.sin(t1) * w];
    const v0 = [-Math.sin(t0) * dir, Math.cos(t0) * dir], v1 = [-Math.sin(t1) * dir, Math.cos(t1) * dir];
    if ((T0[0] - a[0]) * v0[0] + (T0[1] - a[1]) * v0[1] <= 0) continue;
    if ((b[0] - T1[0]) * v1[0] + (b[1] - T1[1]) * v1[1] <= 0) continue;
    const L = Math.hypot(T0[0] - a[0], T0[1] - a[1]) + Math.abs(sweep) * w + Math.hypot(b[0] - T1[0], b[1] - T1[1]);
    if (!best || L < best.L) {
      const pts = [a];
      for (let i = 0; i <= 14; i++) { const q = t0 + sweep * i / 14; pts.push([Math.cos(q) * w, Math.sin(q) * w]); }
      pts.push(b);
      best = { pts, L };
    }
  }
  return best ? best.pts : [a, b];
}
function bowed(pts2, z0, z1, sag, side, wave = 0) {
  // un haz flojo se curva hacia afuera; uno tenso va recto
  const n = pts2.length, out = [];
  const total = pts2.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts2[i - 1][0], p[1] - pts2[i - 1][1]) : 0, 0) || 1;
  let run = 0;
  for (let i = 0; i < n; i++) {
    if (i) run += Math.hypot(pts2[i][0] - pts2[i - 1][0], pts2[i][1] - pts2[i - 1][1]);
    const t = run / total;
    const prev = pts2[Math.max(0, i - 1)], next = pts2[Math.min(n - 1, i + 1)];
    const nx = -(next[1] - prev[1]), ny = next[0] - prev[0], nl = Math.hypot(nx, ny) || 1;
    // relajado: ondulado como el colágeno sin carga (3,5 ondas que se apagan en las inserciones)
    const s = Math.sin(Math.PI * t) * sag * side + Math.sin(t * Math.PI * 7) * wave * Math.min(1, Math.sin(Math.PI * t) * 3);
    out.push(iso([pts2[i][0] + nx / nl * s, pts2[i][1] + ny / nl * s, z0 + (z1 - z0) * t], P));
  }
  return out.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join("");
}
function straight(a, b) { const pts = []; for (let i = 0; i <= 40; i++) pts.push([a[0] + (b[0] - a[0]) * i / 40, a[1] + (b[1] - a[1]) * i / 40]); return pts; }
function tfccSvg(f, ligs) {
  // primero los haces (profundos abajo, superficiales encima), después el disco: es la capa más distal
  // Cada haz nace de una huella en abanico sobre el borde de la escotadura (entesis radial) y termina
  // en una base sobre la fóvea (profundos) o en un collar alrededor de la estiloides (superficiales).
  const foot = (g) => {
    const u = [g.b[0] - g.a[0], g.b[1] - g.a[1]], ul = Math.hypot(...u) || 1, ux = u[0] / ul, uy = u[1] / ul, nx = -uy, ny = ux;
    const P0 = (s, t) => [g.a[0] + ux * s + nx * t, g.a[1] + uy * s + ny * t];
    const ring = [P0(-5.2, -4.2), P0(-5.2, 4.2), P0(-1.2, 3.8), P0(2.6, 1.4), P0(2.6, -1.4), P0(-1.2, -3.8)];
    const z = D.H + 0.05;
    return '<g class="foot ' + (g.to === "fov" ? "deep" : "sup") + '"><path class="foot-body" d="' + onTop(ring, z, P, true) + '"/>'
      + dotsSvg([P0(-3, -2.2), P0(-3, 2.2), P0(-0.6, 0)].map((p) => iso([p[0], p[1], z], P)), { size: 0.45, tone: "hi" }) + "</g>";
  };
  const band = (g) => {
    const deep = g.to === "fov";
    const sag = 3.5 * (1 - Math.min(1, g.e / 0.3));
    const side = g.id[0] === "d" ? 1 : -1;
    const dpath = bowed(straight([g.a[0] + (g.b[0] - g.a[0]) * 0.06, g.a[1] + (g.b[1] - g.a[1]) * 0.06], g.b), deep ? D.H + 0.3 : D.H + 0.6, deep ? D.H + 0.5 : D.STY[2], sag, side);
    const tight = g.e > TIGHT;
    return '<g class="lig ' + (deep ? "deep" : "sup") + '"' + (tight ? " data-tight" : "") + ' data-lig="' + g.id + '"><path class="lig-edge" d="' + dpath + '"/><path class="lig-body" d="' + dpath + '"/></g>';
  };
  const deepL = ligs.filter((g) => g.to === "fov"), supL = ligs.filter((g) => g.to === "sty");
  let out = "";
  for (const g of ligs) out += foot(g);
  for (const g of deepL) out += band(g);
  // base de inserción en la fóvea
  out += solidSvg(cylinder(D.FOV[0], D.FOV[1], 3.4, D.H, 1.1, P, 28), { tone: "mid", className: "anchor deep", crease: "none" });
  out += dotsSvg([iso([D.FOV[0], D.FOV[1], D.H + 1.1], P)], { size: 0.6, tone: "hi" });
  for (const g of supL) out += band(g);
  // collar de inserción alrededor de la estiloides
  out += solidSvg(cylinder(D.STY[0], D.STY[1], D.STY_RAD + 1.3, D.H + 1.4, 3.4, P, 28), { tone: "mid", className: "anchor sup", crease: "none" });
  // disco articular translúcido: base en toda la escotadura (fija al radio), vértice sobre la fóvea,
  // apuntando hacia la estiloides; cubre los dos pares de haces
  const toS = [D.STY[0] * 0.45, D.STY[1] * 0.45];
  const perp = [-toS[1], toS[0]], pl = Math.hypot(...perp) || 1;
  const apex = [[toS[0] - perp[0] / pl * 5, toS[1] - perp[1] / pl * 5], toS, [toS[0] + perp[0] / pl * 5, toS[1] + perp[1] / pl * 5]];
  const base = NOTCH.map((p) => f([p[0] + 1.5, p[1] * 1.04]));
  const ring = [...base];
  // vértice en orden alrededor del polígono (de palmar a dorsal)
  const hull = hullOf2([...base, ...apex]);
  out += solidSvg(extrude(hull, D.H + 3, 0.8, P), { tone: "mid", className: "disc", crease: "none" });
  // centro más delgado (bicóncavo): un óvalo más claro
  const c = f([D.NOTCH_R * 0.45, 0]);
  const oval = []; for (let i = 0; i < 24; i++) { const q = i / 24 * Math.PI * 2; oval.push([c[0] * 0.8 + Math.cos(q) * 8, c[1] * 0.8 + Math.sin(q) * 8]); }
  out += '<path class="disc-thin" d="' + onTop(oval, D.H + 3.8, P, true) + '"/>';
  return out;
}
function hullOf2(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function markSvg(deg) {
  const a = rad(-deg), r0 = D.TT_R - 10, r1 = D.TT_R - 1;
  return lineOnTop([Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * r1, Math.sin(a) * r1], D.TT_H, P);
}
const name = (deg) => Math.abs(deg) < 4 ? "neutro" : (deg > 0 ? "pronación " : "supinación ") + Math.round(Math.abs(deg)) + "°";
let deg = 0, target = 0, frame = 0, last = 0, clock = 0, touring = true, visible = false, idle = 0, side = null;
const TOUR = [0, 70, 0, -75];
function draw() {
  const f = pose(deg);
  const ligs = strainOf(deg);
  // el radio pasa por delante o por detrás del cúbito según de qué lado lo ve el lector
  const c = f([D.RAD_X1 * 0.5, 0]);
  const near = depthOf([c[0], c[1], 0], P) > depthOf([0, 0, 0], P);
  const html = radiusSvg(f);
  if (near) { front.innerHTML = html; if (side !== "front") back.innerHTML = ""; } else { back.innerHTML = html; if (side !== "back") front.innerHTML = ""; }
  side = near ? "front" : "back";
  top.innerHTML = tfccSvg(f, ligs);
  mark.setAttribute("d", markSvg(deg));
  const tight = ligs.filter((g) => g.e > TIGHT).map((g) => g.name);
  const text = name(deg) + " · " + (tight.length ? "tensos: " + tight.join(" y ") : "haces en reposo");
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(Math.round(deg)));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = TOUR[Math.floor(clock / 2.4) % TOUR.length]; }
  deg = still.matches ? target : deg + (target - deg) * (1 - Math.exp(-dt / 0.45));
  if (Math.abs(target - deg) < 0.05) deg = target;
  draw();
  frame = visible && (touring || deg !== target) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (d) => { touring = false; target = clamp(d, -D.ROM, D.ROM); clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4200); run(); };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) touring = false;
stage.addEventListener("pointermove", (e) => { const b = svg.getBoundingClientRect(); steer(((((e.clientX - b.left) / b.width) - 0.5) / 0.35) * D.ROM); });
stage.addEventListener("keydown", (e) => {
  let to = null;
  if (e.key === "ArrowRight" || e.key === "ArrowUp") to = Math.round(target / 10) * 10 + 10;
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = Math.round(target / 10) * 10 - 10;
  if (e.key === "Home") to = 0;
  if (to === null) return;
  e.preventDefault(); steer(to);
});
window.__anatomy = { set: (d) => { touring = false; clearTimeout(idle); target = d; deg = d; draw(); }, strainOf };
draw();
`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "Banco giratorio que reproduce la articulación radiocubital distal vista desde distal. El cúbito es un poste fijo con la fóvea, la estiloides y el tendón del extensor cubital del carpo en su subvaina. El radio gira a su alrededor sobre una plataforma. Los cuatro haces radiocubitales, dorsal y palmar, superficial y profundo, unen el borde de la escotadura sigmoidea con la estiloides y la fóvea; al girar, unos se tensan y otros se aflojan.",
  body: [
    base(),
    turntable(),
    `<path data-part="mark" class="iso-line" data-tone="lit" d="" style="stroke-width:1.2"/>`,
    `<g data-part="radius-back"></g>`,
    ulnaBack(),
    `<g data-part="radius-front"></g>`,
    ulnaTop(),
    `<g data-part="tfcc"></g>`,
  ],
});

const css = `<style>
.iso{--disc:#3b74d6;--sup:#f2c94c;--deep:#ef8a3c;--ecu:#5aa9e6}
.iso[data-theme="light"]{--disc:#4f86e8;--sup:#f4c430;--deep:#ec7a2a;--ecu:#7cc0f2}
.disc{opacity:.34}
.iso[data-theme="light"] .disc{opacity:.3}
.disc>.iso-top,.disc>.iso-fill,.disc>.iso-shade{fill:var(--disc)}
.disc>.iso-edge{stroke:var(--disc)}
.disc-thin{fill:none;stroke:var(--disc);stroke-width:.6;opacity:.6}
.iso-swatch[data-mark="sup"] path{stroke:var(--sup);stroke-width:3}
.iso-swatch[data-mark="deep"] path{stroke:var(--deep);stroke-width:3}
.iso-swatch[data-mark="disc"] path{stroke:var(--disc);stroke-width:5;opacity:.5}
.ecu>.iso-fill,.ecu>.iso-top,.ecu>.iso-shade{fill:var(--ecu)}
.lig path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.lig .lig-edge{stroke:var(--anatomy-mid);stroke-width:4.4}
.lig .lig-body{stroke-width:3}
.lig.sup .lig-body{stroke:var(--sup)}
.lig.deep .lig-body{stroke:var(--deep)}
.lig:not([data-tight]) .lig-body{opacity:.5}
.lig:not([data-tight]) .lig-edge{opacity:.7}
.lig[data-tight] .lig-edge{stroke:var(--anatomy-lit);stroke-width:5.4}
.lig[data-tight] .lig-body{stroke-width:3.4}
.foot-body{stroke:var(--anatomy-mid);stroke-width:.6;stroke-linejoin:round}
.foot.sup .foot-body{fill:var(--sup)}
.foot.deep .foot-body{fill:var(--deep)}
.anchor.sup>.iso-top,.anchor.sup>.iso-fill,.anchor.sup>.iso-shade{fill:var(--sup)}
.anchor.deep>.iso-top,.anchor.deep>.iso-fill,.anchor.deep>.iso-shade{fill:var(--deep)}
.anchor>.iso-edge{stroke:var(--anatomy-mid)}
.anchor.sup>.iso-shade{filter:brightness(.88)}
.anchor.deep>.iso-shade{filter:brightness(.88)}
</style>`;

const body = css + k.plateHtml({
  fig: "Fig 2",
  title: "TFCC en pronosupinación",
  hint: "← → o puntero",
  readout: "neutro · haces en reposo",
  keys: [
    { mark: "blue", label: "Disco articular (fibrocartílago triangular), translúcido: es la capa más distal y cubre los dos pares de haces" },
    { mark: "red", label: "Haces superficiales (dorsal y palmar), a la estiloides" },
    { mark: "green", label: "Haces profundos (dorsal y palmar), a la fóvea. Haz recto con borde marcado = tenso" },
    { mark: "lit", label: "Índice de la plataforma: grados de pronación (derecha) o supinación (izquierda)" },
  ],
  caption:
    "Visto desde distal, el radio gira alrededor del cúbito. La porción radial del complejo, en el borde de la escotadura sigmoidea, acompaña al radio y no cambia; los cambios ocurren en la inserción cubital. Como la fóvea está sobre el eje de giro y la estiloides no, los haces superficiales (a la estiloides) y los profundos (a la fóvea) no se comportan igual: la cabeza cubital además se desliza dentro de la escotadura, más dorsal en pronación y más palmar en supinación. Según el modelo de Hagert, en pronación se tensan el dorsal superficial y el palmar profundo, y en supinación el palmar superficial y el dorsal profundo; la figura muestra ese patrón (haz recto y de borde marcado = tenso). El ECU, en su subvaina, contribuye a estabilizar en supinación. Esquema basado en Bouredoucen, Skeletal Radiol 2026; geometría y desplazamiento ilustrativos.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Pronosupinación: flechas para girar el antebrazo" aria-valuemin="-80" aria-valuemax="80" aria-valuenow="0">${svg}</div>`,
});

const legendFix = (h) => h.replace('data-mark="blue"', 'data-mark="disc"').replace('data-mark="red"', 'data-mark="sup"').replace('data-mark="green"', 'data-mark="deep"');
const name = theme === "light" ? "tfcc-light.html" : "tfcc.html";
writeFileSync(join(HERE, name), k.pageHtml({ title: "TFCC en pronosupinación", theme, body: legendFix(body), script: kitScript() + live }));
console.log("wrote", name);
