import { CLIMB, CONTEST, FISHING, WRESTLE } from './config.js';
import { clamp } from './rng.js';

// ---- Fishing: cast, wait for a bite, pull inside the window ----
export function createFishing(rng, { dawnOrDusk = false } = {}, cfg = FISHING) {
  const [a, b] = cfg.biteDelayMs;
  return {
    state: 'waiting',
    t: 0,
    biteAt: a + rng() * (b - a),
    window: cfg.biteWindowMs + (dawnOrDusk ? cfg.dawnDuskWindowBonusMs : 0),
  };
}

export function stepFishing(f, dtMs) {
  if (f.state === 'waiting' || f.state === 'biting') {
    f.t += dtMs;
    if (f.state === 'waiting' && f.t >= f.biteAt) f.state = 'biting';
    if (f.state === 'biting' && f.t > f.biteAt + f.window) f.state = 'escaped';
  }
  return f.state;
}

export function pullFishing(f) {
  if (f.state === 'biting') f.state = 'caught';
  else if (f.state === 'waiting') f.state = 'early';
  return f.state;
}

// ---- Palm climbing: alternate left and right grips ----
export const createClimb = () => ({ progress: 0, last: null, done: false });

export function climbInput(c, side, cfg = CLIMB) {
  if (c.done) return c;
  if (side === c.last) c.progress = clamp(c.progress - cfg.slipLoss, 0, 1);
  else c.progress = clamp(c.progress + cfg.stepGain, 0, 1);
  c.last = side;
  if (c.progress >= 1) c.done = true;
  return c;
}

// ---- Wrestling: stop the swinging marker inside the sweet spot ----
export function markerAt(tMs, speed = 1) {
  // triangle wave 0..1..0
  const p = ((tMs * speed) / 1000) % 2;
  return p < 1 ? p : 2 - p;
}

/** Throw quality 0..1: 1 at centre of the sweet spot. */
export function throwQuality(marker, cfg = WRESTLE) {
  const [a, b] = cfg.sweetSpot;
  const mid = (a + b) / 2;
  const half = (b - a) / 2;
  return clamp(1 - Math.abs(marker - mid) / (half * 3), 0, 1);
}

/** A round is won if quality, helped by renown and fullness, beats the opponent's skill. */
export function wrestleRound(quality, opponentSkill, renown, fullness) {
  const strength = quality * (1 + renown * 0.02) * (fullness >= 25 ? 1 : 0.8);
  return strength > opponentSkill;
}

export function wrestleMatch(roundWins, cfg = WRESTLE) {
  const wins = roundWins.filter(Boolean).length;
  const need = Math.floor(cfg.rounds / 2) + 1;
  if (wins >= need) return 'won';
  if (roundWins.length - wins >= need) return 'lost';
  return 'ongoing';
}

// ---- Plaiting: follow a pattern of left / right / tuck ----
export const PLAIT_MOVES = ['left', 'right', 'tuck'];

export function createPlait(rng, styleId, cfg = CONTEST) {
  const style = cfg.styles.find((s) => s.id === styleId);
  const pattern = Array.from({ length: style.length }, () => PLAIT_MOVES[Math.floor(rng() * 3)]);
  return { pattern, i: 0, correct: 0, done: false };
}

export function plaitInput(p, move) {
  if (p.done) return p;
  if (p.pattern[p.i] === move) p.correct += 1;
  p.i += 1;
  if (p.i >= p.pattern.length) p.done = true;
  return p;
}

export const plaitAccuracy = (p) => (p.pattern.length ? p.correct / p.pattern.length : 0);
