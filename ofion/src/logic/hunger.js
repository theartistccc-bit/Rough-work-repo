import { HUNGER } from './config.js';
import { clamp } from './rng.js';
import { has, remove } from './inventory.js';

/** Fullness lost over `minutes` of game time. */
export function decay(fullness, minutes, { walking = false, sleeping = false } = {}, cfg = HUNGER) {
  const rate = sleeping
    ? cfg.sleepDecayPerMinute
    : cfg.decayPerMinute * (walking ? cfg.walkMultiplier : 1);
  return clamp(fullness - rate * minutes, 0, cfg.max);
}

export function status(fullness, cfg = HUNGER) {
  if (fullness <= 0) return 'starving';
  if (fullness < cfg.hungryBelow) return 'hungry';
  return 'fed';
}

export function speedFactor(fullness, cfg = HUNGER) {
  const s = status(fullness, cfg);
  if (s === 'starving') return cfg.starvingSpeed;
  if (s === 'hungry') return cfg.hungrySpeed;
  return 1;
}

export function canDo(action, fullness, cfg = HUNGER) {
  return !(status(fullness, cfg) === 'starving' && cfg.blockedWhenStarving.includes(action));
}

/** Pay the fullness cost of an action. Returns new fullness, or null if blocked. */
export function spend(action, fullness, cfg = HUNGER) {
  if (!canDo(action, fullness, cfg)) return null;
  return clamp(fullness - (cfg.actionCost[action] ?? 0), 0, cfg.max);
}

/**
 * Eat one item, or a meal (yam + fish together).
 * Returns { ok, fullness, reason }. Mutates inventory on success.
 */
export function eat(fullness, inv, food, cfg = HUNGER) {
  if (fullness > cfg.fullAbove) return { ok: false, fullness, reason: 'full' };
  if (food === 'meal') {
    if (!has(inv, 'yam') || !has(inv, 'fish')) return { ok: false, fullness, reason: 'missing' };
    remove(inv, 'yam');
    remove(inv, 'fish');
    const gain = cfg.food.yam + cfg.food.fish + cfg.mealBonus;
    return { ok: true, fullness: clamp(fullness + gain, 0, cfg.max) };
  }
  const gain = cfg.food[food];
  if (gain == null) return { ok: false, fullness, reason: 'inedible' };
  if (!has(inv, food)) return { ok: false, fullness, reason: 'missing' };
  remove(inv, food);
  return { ok: true, fullness: clamp(fullness + gain, 0, cfg.max) };
}
