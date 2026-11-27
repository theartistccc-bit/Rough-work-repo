// Rules for the new activities: periwinkle gathering, pounding yam, cooking soup, paddling.
import { ACTIVITIES, HUNGER } from './config.js';
import { clamp } from './rng.js';
import { has, remove } from './inventory.js';
import { markerAt } from './minigames.js';

// ---- Periwinkles: shells appear on the roots; move your hand under one and pick it ----
export function createGather(cfg = ACTIVITIES.periwinkle) {
  return { t: 0, hand: 0.5, shells: [], got: 0, nextSpawn: 300, done: false, cfg };
}

export function stepGather(s, dtMs, rng) {
  if (s.done) return s;
  s.t += dtMs;
  if (s.t >= s.nextSpawn) {
    s.shells.push({ x: 0.06 + rng() * 0.88, born: s.t });
    s.nextSpawn = s.t + s.cfg.spawnMs;
  }
  s.shells = s.shells.filter((sh) => s.t - sh.born < s.cfg.lifeMs);
  if (s.t >= s.cfg.durationMs) s.done = true;
  return s;
}

export function moveHand(s, dir) {
  s.hand = clamp(s.hand + dir * s.cfg.handSpeed, 0, 1);
  return s.hand;
}

/** Pick: takes every shell within reach of the hand. Returns how many. */
export function pick(s) {
  if (s.done) return 0;
  const near = s.shells.filter((sh) => Math.abs(sh.x - s.hand) <= s.cfg.reach);
  s.shells = s.shells.filter((sh) => !near.includes(sh));
  s.got += near.length;
  return near.length;
}

// ---- Pounding yam: strike on the drum beat ----
export function isOnBeat(tMs, cfg = ACTIVITIES.pound) {
  const phase = tMs % cfg.beatMs;
  return Math.min(phase, cfg.beatMs - phase) <= cfg.windowMs;
}

/** Fullness from a bowl of pounded yam: a plain yam's worth plus a bonus for good rhythm. */
export function poundGain(hits, cfg = ACTIVITIES.pound) {
  return Math.round(cfg.base + cfg.bonus * clamp(hits / cfg.beats, 0, 1));
}

// ---- Soup: add each ingredient while the fire is at a good heat ----
export const heatAt = (tMs) => markerAt(tMs, 0.7);
export const goodHeat = (heat, cfg = ACTIVITIES.soup) => heat >= cfg.goodHeat[0] && heat <= cfg.goodHeat[1];
export const canCook = (inv, cfg = ACTIVITIES.soup) => Object.entries(cfg.needs).every(([k, n]) => has(inv, k, n));

export function cookSoup(inv, goodAdds, cfg = ACTIVITIES.soup) {
  if (!canCook(inv, cfg)) return { ok: false, reason: 'missing' };
  for (const [k, n] of Object.entries(cfg.needs)) remove(inv, k, n);
  const steps = Object.keys(cfg.needs).length;
  const quality = clamp(goodAdds / steps, 0, 1);
  return { ok: true, quality, gain: Math.round(cfg.base + cfg.bonus * quality) };
}

export const eatSoup = (fullness, soup) => clamp(fullness + soup.gain, 0, HUNGER.max);
export const shareSoup = (affection, soup, cfg = ACTIVITIES.soup) =>
  clamp(affection + Math.round(cfg.shareAffection * (0.5 + soup.quality / 2)), 0, 100);

// ---- Paddling: alternate strokes to keep the canoe straight and fast ----
export const createPaddle = () => ({ speed: 0, dist: 0, last: null, done: false });

export function stroke(p, side, cfg = ACTIVITIES.paddle) {
  if (p.done) return p;
  if (side === p.last) p.speed *= cfg.sameSideFactor; // the canoe swings toward the bank
  else p.speed = Math.min(cfg.maxSpeed, p.speed + cfg.strokeGain);
  p.last = side;
  return p;
}

export function stepPaddle(p, dtMs, cfg = ACTIVITIES.paddle) {
  if (p.done) return p;
  const dt = dtMs / 1000;
  p.dist = Math.min(1, p.dist + p.speed * cfg.distPerSpeedSec * dt);
  p.speed *= Math.exp(-cfg.decayPerSec * dt);
  if (p.dist >= 1) p.done = true;
  return p;
}

export const upriverOpen = (minute, cfg = ACTIVITIES) => minute >= cfg.upriverOpen[0] && minute <= cfg.upriverOpen[1];
