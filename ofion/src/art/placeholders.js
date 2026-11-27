// Placeholder paintings, drawn once at boot into textures.
// Each one is replaced automatically when ./assets/<key>.png exists.
import { P } from './palette.js';
import { makeRng } from '../logic/rng.js';

// soft overlapping dabs give a brushy, hand-painted surface
function dabs(g, rng, x, y, w, h, color, n = 18, alpha = 0.18, size = 0.25) {
  g.fillStyle(color, alpha);
  for (let i = 0; i < n; i++) {
    const rw = w * size * (0.5 + rng());
    const rh = h * size * (0.3 + rng() * 0.6);
    g.fillEllipse(x + rng() * w, y + rng() * h, rw, rh);
  }
}

function strokes(g, rng, x, y, w, h, color, n = 20, alpha = 0.35, len = 12, width = 2) {
  g.lineStyle(width, color, alpha);
  for (let i = 0; i < n; i++) {
    const sx = x + rng() * w;
    const sy = y + rng() * h;
    g.lineBetween(sx, sy, sx + (rng() - 0.5) * len, sy + rng() * len);
  }
}

// ---------- people ----------
function person(o) {
  return (g, w, h) => {
    const rng = makeRng(o.seed ?? 1);
    const cx = w / 2;
    const skin = o.skin ?? P.skin;
    // legs
    g.fillStyle(skin, 1);
    g.fillRect(cx - 9, h * 0.78, 7, h * 0.2);
    g.fillRect(cx + 2, h * 0.78, 7, h * 0.2);
    // torso
    g.fillStyle(skin, 1);
    g.fillEllipse(cx, h * 0.42, w * 0.58, h * 0.3);
    // arms
    g.fillRect(cx - w * 0.36, h * 0.32, 6, h * 0.28);
    g.fillRect(cx + w * 0.36 - 6, h * 0.32, 6, h * 0.28);
    // wrapper (tied at chest or waist)
    const top = o.wrapChest ? h * 0.33 : h * 0.5;
    g.fillStyle(o.wrapper, 1);
    g.fillRect(cx - w * 0.32, top, w * 0.64, h * 0.82 - top);
    g.fillStyle(o.wrapper2 ?? P.cream, 0.85);
    for (let yy = top + 6; yy < h * 0.8; yy += 9) g.fillRect(cx - w * 0.32, yy, w * 0.64, 2.5);
    dabs(g, rng, cx - w * 0.32, top, w * 0.64, h * 0.82 - top, 0x000000, 6, 0.08);
    // beads
    if (o.beads) {
      g.fillStyle(P.coral, 1);
      for (let i = -3; i <= 3; i++) g.fillCircle(cx + i * 3.4, h * 0.29 + Math.abs(i) * -0.6 + 2, 2);
    }
    // camwood body markings
    if (o.camwood) {
      g.fillStyle(P.camwood, 0.6);
      g.fillCircle(cx - 6, h * 0.4, 2);
      g.fillCircle(cx + 6, h * 0.4, 2);
    }
    // head
    g.fillStyle(skin, 1);
    g.fillEllipse(cx, h * 0.17, w * 0.42, h * 0.17);
    dabs(g, rng, cx - w * 0.2, h * 0.09, w * 0.4, h * 0.16, P.skinLight, 5, 0.25);
    // hair
    g.fillStyle(P.hair, 1);
    if (o.hair === 'tall') {
      g.fillEllipse(cx, h * 0.06, w * 0.36, h * 0.12);
      g.fillEllipse(cx, h * 0.015, w * 0.22, h * 0.07);
    } else if (o.hair === 'grey') {
      g.fillStyle(0xbdb6a8, 1);
      g.fillEllipse(cx, h * 0.1, w * 0.42, h * 0.07);
    } else {
      g.fillEllipse(cx, h * 0.1, w * 0.42, h * 0.07);
    }
    if (o.cap) {
      g.fillStyle(o.cap, 1);
      g.fillRect(cx - w * 0.2, h * 0.06, w * 0.4, h * 0.05);
    }
    if (o.staff) {
      g.fillStyle(P.wood, 1);
      g.fillRect(w - 6, h * 0.12, 4, h * 0.86);
    }
  };
}

// ---------- village ----------
// rectangular mud-walled house with a steep palm-thatch gable roof
function hut(wall, accent) {
  return (g, w, h) => {
    const rng = makeRng(w + h);
    const wallTop = h * 0.45;
    g.fillStyle(wall, 1);
    g.fillRect(w * 0.08, wallTop, w * 0.84, h * 0.55);
    dabs(g, rng, w * 0.08, wallTop, w * 0.84, h * 0.55, P.mudDark, 22, 0.15);
    // painted band along the wall
    g.fillStyle(accent, 0.9);
    g.fillRect(w * 0.08, h * 0.82, w * 0.84, h * 0.05);
    g.fillStyle(P.cream, 0.8);
    for (let x = w * 0.12; x < w * 0.9; x += 16) g.fillTriangle(x, h * 0.82, x + 8, h * 0.82, x + 4, h * 0.77);
    // doorway
    g.fillStyle(0x2a1a10, 1);
    g.fillRect(w * 0.42, h * 0.62, w * 0.16, h * 0.38);
    // roof
    g.fillStyle(P.thatch, 1);
    g.fillTriangle(0, wallTop + 8, w, wallTop + 8, w / 2, 0);
    g.fillStyle(P.thatchDark, 1);
    g.fillRect(0, wallTop, w, 10);
    strokes(g, rng, w * 0.1, 10, w * 0.8, wallTop - 10, P.thatchDark, 70, 0.5, 18, 2);
    strokes(g, rng, w * 0.1, 10, w * 0.8, wallTop - 10, 0xd8b060, 30, 0.35, 14, 1.5);
  };
}

function stall(cloth) {
  return (g, w, h) => {
    const rng = makeRng(cloth);
    g.fillStyle(P.wood, 1);
    g.fillRect(8, h * 0.25, 6, h * 0.75);
    g.fillRect(w - 14, h * 0.25, 6, h * 0.75);
    g.fillStyle(P.thatch, 1);
    g.fillTriangle(0, h * 0.3, w, h * 0.3, w / 2, 0);
    strokes(g, rng, 10, 6, w - 20, h * 0.22, P.thatchDark, 40, 0.5, 12, 2);
    g.fillStyle(P.wood, 1);
    g.fillRect(4, h * 0.68, w - 8, 8);
    g.fillStyle(cloth, 1);
    g.fillRect(6, h * 0.74, w - 12, h * 0.26);
    dabs(g, rng, 6, h * 0.74, w - 12, h * 0.26, P.cream, 8, 0.2);
    // baskets and pots on the table
    g.fillStyle(P.thatchDark, 1);
    g.fillEllipse(w * 0.3, h * 0.64, 34, 18);
    g.fillStyle(P.terracotta, 1);
    g.fillCircle(w * 0.62, h * 0.6, 12);
  };
}

// oil palm: rough trunk ringed with old frond bases, feathery crown and fruit bunch
function palm(g, w, h) {
  const rng = makeRng(77);
  const cx = w / 2;
  g.fillStyle(P.trunk, 1);
  g.fillRect(cx - 9, h * 0.18, 18, h * 0.82);
  g.fillStyle(0x4f3520, 1);
  for (let y = h * 0.22; y < h; y += 14) g.fillTriangle(cx - 11, y, cx + 11, y, cx + (rng() - 0.5) * 6, y + 9);
  // fronds
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI * (0.05 + (0.9 * i) / 10);
    const len = w * 0.55 * (0.75 + rng() * 0.3);
    const ex = cx + Math.cos(a) * len;
    const ey = h * 0.2 + Math.sin(a) * len * 0.6 + len * 0.25;
    g.lineStyle(4, i % 2 ? P.palm : P.palmLight, 1);
    g.lineBetween(cx, h * 0.2, ex, ey);
    g.lineStyle(2, P.palm, 0.8);
    for (let t = 0.2; t < 1; t += 0.12) {
      const px = cx + (ex - cx) * t;
      const py = h * 0.2 + (ey - h * 0.2) * t;
      g.lineBetween(px, py, px + 6, py + 10);
      g.lineBetween(px, py, px - 6, py + 10);
    }
  }
  // fruit bunch
  g.fillStyle(P.coral, 1);
  g.fillCircle(cx + 6, h * 0.24, 7);
  g.fillStyle(P.camwood, 1);
  g.fillCircle(cx - 4, h * 0.25, 6);
  // tapper's gourd
  g.fillStyle(P.ochre, 1);
  g.fillEllipse(cx - 14, h * 0.3, 14, 18);
}

function shadeTree(g, w, h) {
  const rng = makeRng(31);
  g.fillStyle(P.trunk, 1);
  g.fillRect(w / 2 - 16, h * 0.45, 32, h * 0.55);
  g.fillTriangle(w / 2 - 16, h, w / 2 - 40, h, w / 2 - 16, h * 0.8);
  g.fillTriangle(w / 2 + 16, h, w / 2 + 40, h, w / 2 + 16, h * 0.8);
  g.fillStyle(P.mangrove, 1);
  g.fillEllipse(w / 2, h * 0.32, w * 0.95, h * 0.5);
  dabs(g, rng, 0, 0, w, h * 0.55, P.palm, 40, 0.5, 0.25);
  dabs(g, rng, 0, 0, w, h * 0.45, P.palmLight, 20, 0.35, 0.18);
}

function mangrove(g, w, h) {
  const rng = makeRng(13);
  g.lineStyle(4, 0x3a2a1c, 1);
  for (let i = 0; i < 9; i++) {
    const x = w * 0.2 + rng() * w * 0.6;
    g.lineBetween(w / 2, h * 0.5, x, h);
  }
  g.fillStyle(P.mangrove, 1);
  g.fillEllipse(w / 2, h * 0.35, w * 0.9, h * 0.5);
  dabs(g, rng, 0, 0, w, h * 0.6, P.palm, 30, 0.45);
}

function canoe(g, w, h) {
  g.fillStyle(P.wood, 1);
  g.fillPoints([{ x: 0, y: 4 }, { x: w, y: 4 }, { x: w * 0.9, y: h }, { x: w * 0.1, y: h }], true);
  g.fillStyle(0x4a2e18, 1);
  g.fillRect(w * 0.08, 4, w * 0.84, 6);
  g.lineStyle(3, P.wood, 1);
  g.lineBetween(w * 0.7, 0, w * 0.95, -h);
}

function jetty(g, w, h) {
  g.fillStyle(P.wood, 1);
  g.fillRect(0, 0, w, 12);
  for (let x = 8; x < w; x += 40) g.fillRect(x, 0, 8, h);
  g.lineStyle(1, 0x3a2410, 0.6);
  for (let x = 0; x < w; x += 14) g.lineBetween(x, 0, x, 12);
}

function fire(g, w, h) {
  g.fillStyle(0x3a2410, 1);
  g.fillRect(w * 0.15, h * 0.8, w * 0.7, 8);
  g.fillStyle(P.red, 1);
  g.fillTriangle(w * 0.2, h * 0.82, w * 0.8, h * 0.82, w * 0.5, h * 0.15);
  g.fillStyle(P.fire, 1);
  g.fillTriangle(w * 0.3, h * 0.82, w * 0.7, h * 0.82, w * 0.5, h * 0.35);
  g.fillStyle(0xffe08a, 1);
  g.fillTriangle(w * 0.42, h * 0.82, w * 0.58, h * 0.82, w * 0.5, h * 0.55);
}

function glow(g, w, h) {
  for (let r = w / 2; r > 0; r -= 8) {
    g.fillStyle(0xffb050, 0.05);
    g.fillCircle(w / 2, h / 2, r);
  }
}

function moon(g, w, h) {
  g.fillStyle(0xfff4d6, 0.15);
  g.fillCircle(w / 2, h / 2, w / 2);
  g.fillStyle(0xfff1cc, 1);
  g.fillCircle(w / 2, h / 2, w * 0.36);
  g.fillStyle(0xe8d8b0, 0.6);
  g.fillCircle(w * 0.42, h * 0.45, w * 0.07);
  g.fillCircle(w * 0.58, h * 0.6, w * 0.05);
}

function ring(g, w, h) {
  g.fillStyle(P.sand, 0.9);
  g.fillEllipse(w / 2, h / 2, w, h);
  g.lineStyle(3, P.cream, 0.7);
  g.strokeEllipse(w / 2, h / 2, w * 0.92, h * 0.8);
}

function farLayer(g, w, h) {
  const rng = makeRng(5);
  g.fillStyle(0x3b5a38, 1);
  for (let x = -40; x < w + 40; x += 60 + rng() * 40) g.fillEllipse(x, h * 0.55, 140 + rng() * 80, h * (0.6 + rng() * 0.4));
  g.fillRect(0, h * 0.6, w, h * 0.4);
  // distant oil palms: thin trunk, drooping feathery crown
  for (let x = 30; x < w; x += 120 + rng() * 120) {
    const top = h * (0.05 + rng() * 0.12);
    g.fillStyle(0x2f4a2e, 1);
    g.fillRect(x, top, 5, h * 0.62 - top);
    g.lineStyle(3, 0x2f4a2e, 1);
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * (-0.95 + i * 0.1) + (rng() - 0.5) * 0.15;
      const len = 26 + rng() * 12;
      const mx = x + 2 + Math.cos(a) * len * 0.6;
      const my = top + Math.sin(a) * len * 0.4;
      g.lineBetween(x + 2, top, mx, my);
      g.lineBetween(mx, my, x + 2 + Math.cos(a) * len, top + Math.sin(a) * len * 0.2 + len * 0.45);
    }
  }
}

function groundTile(g, w, h) {
  const rng = makeRng(9);
  g.fillStyle(P.earth, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x8f6a3a, 1);
  g.fillRect(0, 0, w, 6);
  dabs(g, rng, 0, 0, w, h, P.sand, 30, 0.2, 0.2);
  dabs(g, rng, 0, 0, w, h, P.mudDark, 20, 0.18, 0.15);
}

function waterTile(g, w, h) {
  const rng = makeRng(4);
  g.fillStyle(P.water, 1);
  g.fillRect(0, 0, w, h);
  g.lineStyle(2, P.waterLight, 0.5);
  for (let i = 0; i < 24; i++) {
    const x = rng() * w;
    const y = rng() * h;
    g.lineBetween(x, y, x + 18 + rng() * 20, y);
  }
}

// ---------- hairstyle busts (contest & plaiting) ----------
function bust(style) {
  return (g, w, h) => {
    const cx = w / 2;
    // shoulders and neck
    g.fillStyle(P.skin, 1);
    g.fillEllipse(cx, h * 0.98, w * 0.9, h * 0.3);
    g.fillRect(cx - 14, h * 0.62, 28, h * 0.22);
    g.fillStyle(P.coral, 1);
    for (let i = -4; i <= 4; i++) g.fillCircle(cx + i * 7, h * 0.84 + Math.abs(i) * -0.8, 4);
    // face
    g.fillStyle(P.skin, 1);
    g.fillEllipse(cx, h * 0.55, w * 0.42, h * 0.3);
    g.fillStyle(P.camwood, 0.5);
    g.fillCircle(cx - 16, h * 0.58, 4);
    g.fillCircle(cx + 16, h * 0.58, 4);
    g.fillStyle(P.hair, 1);
    if (style === 'plain') {
      g.fillEllipse(cx, h * 0.42, w * 0.46, h * 0.16);
    } else if (style === 'ridges') {
      g.fillEllipse(cx, h * 0.38, w * 0.5, h * 0.24);
      g.lineStyle(3, 0x4a3a2a, 1);
      for (let i = -3; i <= 3; i++) g.lineBetween(cx + i * 10, h * 0.28, cx + i * 12, h * 0.46);
      g.lineStyle(2, P.ochre, 0.9);
      for (let i = -3; i <= 3; i++) g.lineBetween(cx + i * 10 - 3, h * 0.33, cx + i * 10 + 3, h * 0.33);
    } else if (style === 'crest') {
      g.fillEllipse(cx, h * 0.4, w * 0.5, h * 0.2);
      for (let i = 0; i < 4; i++) g.fillEllipse(cx, h * (0.3 - i * 0.07), w * (0.32 - i * 0.05), h * 0.1);
      g.lineStyle(2, P.ochre, 0.9);
      for (let i = 0; i < 4; i++) g.strokeEllipse(cx, h * (0.3 - i * 0.07), w * (0.3 - i * 0.05), h * 0.08);
    } else if (style === 'crown') {
      g.fillEllipse(cx, h * 0.4, w * 0.52, h * 0.2);
      g.fillEllipse(cx - w * 0.17, h * 0.2, w * 0.2, h * 0.3);
      g.fillEllipse(cx + w * 0.17, h * 0.2, w * 0.2, h * 0.3);
      g.fillStyle(P.coral, 1);
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) g.fillCircle(cx + s * w * 0.3, h * (0.3 + i * 0.06), 3.5);
      g.lineStyle(2, P.ochre, 0.9);
      g.strokeEllipse(cx - w * 0.17, h * 0.2, w * 0.14, h * 0.22);
      g.strokeEllipse(cx + w * 0.17, h * 0.2, w * 0.14, h * 0.22);
    }
  };
}

// ---------- portraits (dialogs) ----------
// Placeholder head-and-shoulders. Meant to be replaced by real portraits:
// ./assets/portrait_<who>.png / .jpg / .webp, any size near 5:6 (e.g. 600x720).
function portrait(o) {
  return (g, w, h) => {
    const cx = w / 2;
    const skin = o.skin ?? P.skin;
    g.fillStyle(0x5a3a24, 1);
    g.fillRect(0, 0, w, h);
    for (let r = w * 0.7; r > 0; r -= 12) { g.fillStyle(0xc8873a, 0.035); g.fillCircle(cx, h * 0.4, r); }
    // shoulders and wrapper
    g.fillStyle(skin, 1);
    g.fillEllipse(cx, h * 1.02, w * 0.95, h * 0.42);
    g.fillStyle(o.wrapper, 1);
    g.fillRect(cx - w * 0.48, o.wrapChest ? h * 0.9 : h * 0.97, w * 0.96, h * 0.1);
    if (o.beads) { g.fillStyle(P.coral, 1); for (let i = -5; i <= 5; i++) g.fillCircle(cx + i * 11, h * 0.84 - Math.abs(i) * 1.2, 5); }
    // neck and head with simple side light for volume
    g.fillStyle(skin, 1);
    g.fillRect(cx - 26, h * 0.6, 52, h * 0.2);
    g.fillEllipse(cx, h * 0.45, w * 0.44, h * 0.42);
    g.fillStyle(0x000000, 0.18);
    g.fillEllipse(cx + w * 0.08, h * 0.47, w * 0.3, h * 0.38);
    g.fillStyle(P.skinLight, 0.35);
    g.fillEllipse(cx - w * 0.07, h * 0.42, w * 0.2, h * 0.28);
    // features
    g.fillStyle(0x1a0f0a, 1);
    g.fillEllipse(cx - 24, h * 0.44, 16, 7);
    g.fillEllipse(cx + 24, h * 0.44, 16, 7);
    g.fillStyle(0x2e1a10, 0.8);
    g.fillEllipse(cx, h * 0.52, 18, 10);
    g.fillStyle(0x4a2418, 1);
    g.fillEllipse(cx, h * 0.585, 30, 8);
    if (o.camwood) { g.fillStyle(P.camwood, 0.45); g.fillCircle(cx - 34, h * 0.52, 7); g.fillCircle(cx + 34, h * 0.52, 7); }
    // hair
    g.fillStyle(o.hair === 'grey' ? 0xbdb6a8 : P.hair, 1);
    if (o.hair === 'tall') {
      g.fillEllipse(cx, h * 0.26, w * 0.46, h * 0.16);
      g.fillEllipse(cx, h * 0.15, w * 0.3, h * 0.14);
      g.fillEllipse(cx, h * 0.07, w * 0.18, h * 0.1);
    } else {
      g.fillEllipse(cx, h * 0.27, w * 0.45, h * 0.13);
    }
    if (o.cap) { g.fillStyle(o.cap, 1); g.fillRect(cx - w * 0.22, h * 0.21, w * 0.44, h * 0.06); }
    g.lineStyle(6, 0xc8873a, 0.9);
    g.strokeRect(3, 3, w - 6, h - 6);
  };
}

// ---------- goods icons ----------
const ICONS = {
  fish: (g, w, h) => {
    g.fillStyle(0x7a8f8a, 1);
    g.fillEllipse(w * 0.45, h / 2, w * 0.7, h * 0.4);
    g.fillTriangle(w * 0.75, h / 2, w, h * 0.25, w, h * 0.75);
    g.fillStyle(0x111111, 1);
    g.fillCircle(w * 0.25, h * 0.45, 2);
  },
  yam: (g, w, h) => {
    g.fillStyle(0x7a5232, 1);
    g.fillEllipse(w / 2, h / 2, w * 0.9, h * 0.45);
    g.fillStyle(0x5a3a22, 0.6);
    g.fillCircle(w * 0.35, h * 0.45, 2);
    g.fillCircle(w * 0.6, h * 0.55, 2);
  },
  plantain: (g, w, h) => {
    g.lineStyle(7, 0xc9b23a, 1);
    g.beginPath();
    g.arc(w / 2, h * 0.1, w * 0.4, 0.5, Math.PI - 0.5);
    g.strokePath();
  },
  periwinkle: (g, w, h) => {
    g.fillStyle(0x3a3028, 1);
    g.fillTriangle(w * 0.3, h * 0.85, w * 0.7, h * 0.85, w * 0.5, h * 0.1);
    g.lineStyle(1.5, 0x8a7a68, 1);
    for (let i = 1; i < 4; i++) g.lineBetween(w * (0.5 - i * 0.06), h * (0.2 + i * 0.18), w * (0.5 + i * 0.06), h * (0.2 + i * 0.18));
  },
  palmwine: (g, w, h) => {
    g.fillStyle(P.ochre, 1);
    g.fillCircle(w / 2, h * 0.6, w * 0.34);
    g.fillRect(w * 0.42, h * 0.1, w * 0.16, h * 0.3);
    g.fillStyle(P.cream, 0.9);
    g.fillEllipse(w / 2, h * 0.12, w * 0.2, 5);
  },
  palmoil: (g, w, h) => {
    g.fillStyle(P.terracotta, 1);
    g.fillEllipse(w / 2, h * 0.6, w * 0.8, h * 0.6);
    g.fillStyle(0xe0601a, 1);
    g.fillEllipse(w / 2, h * 0.38, w * 0.6, h * 0.16);
  },
  thread: (g, w, h) => {
    g.fillStyle(0xd8c08a, 1);
    g.fillEllipse(w / 2, h / 2, w * 0.7, h * 0.5);
    g.lineStyle(1.5, 0xa08a50, 1);
    for (let i = 0; i < 5; i++) g.lineBetween(w * 0.2, h * (0.35 + i * 0.07), w * 0.8, h * (0.3 + i * 0.07));
  },
  beads: (g, w, h) => {
    g.fillStyle(P.coral, 1);
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (0.15 + i * 0.12);
      g.fillCircle(w / 2 + Math.cos(a) * w * 0.35, h * 0.2 + Math.sin(a) * h * 0.55, 3.5);
    }
  },
  camwood: (g, w, h) => {
    g.fillStyle(P.camwood, 1);
    g.fillRect(w * 0.15, h * 0.35, w * 0.7, h * 0.3);
    g.fillStyle(0xc0503a, 1);
    g.fillEllipse(w * 0.3, h * 0.8, w * 0.4, h * 0.2);
  },
  comb: (g, w, h) => {
    g.fillStyle(P.wood, 1);
    g.fillRect(w * 0.2, h * 0.15, w * 0.6, h * 0.25);
    for (let i = 0; i < 6; i++) g.fillRect(w * (0.22 + i * 0.1), h * 0.4, 3, h * 0.45);
  },
  pot: (g, w, h) => {
    g.fillStyle(P.terracotta, 1);
    g.fillCircle(w / 2, h * 0.58, w * 0.38);
    g.fillRect(w * 0.32, h * 0.1, w * 0.36, h * 0.2);
    g.lineStyle(2, P.cream, 0.7);
    g.lineBetween(w * 0.15, h * 0.58, w * 0.85, h * 0.58);
  },
};

// ---------- the manifest of every swappable picture ----------
// key -> display size (w, h) and the placeholder painter.
// Drop ./assets/<key>.png (or .webp / .jpg) to replace one; it is shown at the same size.
const C = { w: 44, h: 92 };
export const SPRITES = {
  player: { ...C, paint: person({ wrapper: P.indigo, wrapper2: P.ochre, seed: 2 }) },
  ini: { ...C, paint: person({ wrapper: P.red, wrapper2: P.cream, wrapChest: true, beads: true, camwood: true, hair: 'tall', skin: P.skinLight, seed: 3 }) },
  elder: { ...C, paint: person({ wrapper: P.cream, wrapper2: P.indigo, hair: 'grey', staff: true, seed: 4 }) },
  trader_fishwife: { ...C, paint: person({ wrapper: P.water, wrapper2: P.cream, wrapChest: true, cap: P.indigo, seed: 5 }) },
  trader_farmer: { ...C, paint: person({ wrapper: P.ochre, wrapper2: P.mudDark, seed: 6 }) },
  trader_adorner: { ...C, paint: person({ wrapper: P.camwood, wrapper2: P.ochre, wrapChest: true, beads: true, cap: P.coral, seed: 7 }) },
  wrestler: { ...C, paint: person({ wrapper: P.mudDark, wrapper2: P.camwood, camwood: true, seed: 8 }) },
  trader_ekpo: { ...C, paint: person({ wrapper: P.cream, wrapper2: P.camwood, hair: 'grey', seed: 12 }) },
  trader_uduak: { ...C, paint: person({ wrapper: P.indigo, wrapper2: P.ochre, wrapChest: true, cap: P.ochre, seed: 13 }) },
  drummer: { ...C, paint: person({ wrapper: P.camwood, wrapper2: P.cream, camwood: true, seed: 14 }) },
  rival_affiong: { ...C, paint: person({ wrapper: P.indigo, wrapper2: P.coral, wrapChest: true, beads: true, hair: 'tall', seed: 9 }) },
  rival_nkoyo: { ...C, paint: person({ wrapper: P.ochre, wrapper2: P.red, wrapChest: true, beads: true, hair: 'tall', seed: 10 }) },
  rival_ekaette: { ...C, paint: person({ wrapper: P.palm, wrapper2: P.cream, wrapChest: true, beads: true, hair: 'tall', seed: 11 }) },
  hut: { w: 260, h: 210, paint: hut(P.mud, P.camwood) },
  hut_ini: { w: 260, h: 210, paint: hut(0xb98656, P.indigo) },
  stall_fishwife: { w: 170, h: 130, paint: stall(P.water) },
  stall_farmer: { w: 170, h: 130, paint: stall(P.ochre) },
  stall_adorner: { w: 170, h: 130, paint: stall(P.camwood) },
  palm: { w: 140, h: 380, paint: palm },
  shade_tree: { w: 300, h: 320, paint: shadeTree },
  mangrove: { w: 220, h: 200, paint: mangrove },
  canoe: { w: 170, h: 36, paint: canoe },
  jetty: { w: 220, h: 70, paint: jetty },
  fire: { w: 60, h: 70, paint: fire },
  glow: { w: 320, h: 320, paint: glow },
  moon: { w: 80, h: 80, paint: moon },
  ring: { w: 240, h: 40, paint: ring },
  bg_far: { w: 1024, h: 260, paint: farLayer, tile: true },
  ground: { w: 256, h: 120, paint: groundTile, tile: true },
  water: { w: 256, h: 140, paint: waterTile, tile: true },
  bust_plain: { w: 180, h: 220, paint: bust('plain') },
  bust_ridges: { w: 180, h: 220, paint: bust('ridges') },
  bust_crest: { w: 180, h: 220, paint: bust('crest') },
  bust_crown: { w: 180, h: 220, paint: bust('crown') },
};
const PORTRAIT = { w: 300, h: 360 };
const PORTRAITS = {
  player: { wrapper: P.indigo },
  ini: { wrapper: P.red, wrapChest: true, beads: true, camwood: true, hair: 'tall', skin: P.skinLight },
  elder: { wrapper: P.cream, hair: 'grey' },
  fishwife: { wrapper: P.water, wrapChest: true, cap: P.indigo },
  farmer: { wrapper: P.ochre },
  adorner: { wrapper: P.camwood, wrapChest: true, beads: true, cap: P.coral },
  wrestler: { wrapper: P.mudDark, camwood: true },
  ekpo: { wrapper: P.cream, hair: 'grey' },
  uduak: { wrapper: P.indigo, wrapChest: true, cap: P.ochre },
  affiong: { wrapper: P.indigo, wrapChest: true, beads: true, hair: 'tall' },
  nkoyo: { wrapper: P.ochre, wrapChest: true, beads: true, hair: 'tall' },
  ekaette: { wrapper: P.palm, wrapChest: true, beads: true, hair: 'tall' },
};
for (const [who, o] of Object.entries(PORTRAITS)) SPRITES[`portrait_${who}`] = { ...PORTRAIT, paint: portrait(o) };
for (const [good, paint] of Object.entries(ICONS)) SPRITES[`icon_${good}`] = { w: 32, h: 32, paint };
