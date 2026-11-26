import { describe, expect, it } from 'vitest';
import { HUNGER } from '../src/logic/config.js';
import { canDo, decay, eat, spend, speedFactor, status } from '../src/logic/hunger.js';

describe('hunger', () => {
  it('drains with time, faster while walking, slower while sleeping', () => {
    expect(decay(70, 100)).toBeCloseTo(70 - 100 * HUNGER.decayPerMinute);
    expect(decay(70, 100, { walking: true })).toBeCloseTo(70 - 100 * HUNGER.decayPerMinute * HUNGER.walkMultiplier);
    expect(decay(70, 100, { sleeping: true })).toBeCloseTo(70 - 100 * HUNGER.sleepDecayPerMinute);
    expect(decay(1, 10_000)).toBe(0);
  });

  it('a full belly empties in about 33 game hours of idling', () => {
    expect(HUNGER.max / HUNGER.decayPerMinute / 60).toBeCloseTo(33.3, 0);
  });

  it('classifies fed, hungry and starving and slows you down', () => {
    expect(status(50)).toBe('fed');
    expect(status(HUNGER.hungryBelow - 1)).toBe('hungry');
    expect(status(0)).toBe('starving');
    expect(speedFactor(50)).toBe(1);
    expect(speedFactor(10)).toBe(HUNGER.hungrySpeed);
    expect(speedFactor(0)).toBe(HUNGER.starvingSpeed);
  });

  it('the starving cannot climb or wrestle, but can still fish', () => {
    expect(canDo('climb', 0)).toBe(false);
    expect(canDo('wrestle', 0)).toBe(false);
    expect(canDo('cast', 0)).toBe(true);
    expect(spend('climb', 0)).toBeNull();
    expect(spend('climb', 50)).toBe(50 - HUNGER.actionCost.climb);
  });

  it('eats yam and fish from the inventory', () => {
    const inv = { yam: 1, fish: 1 };
    expect(eat(40, inv, 'yam')).toEqual({ ok: true, fullness: 40 + HUNGER.food.yam });
    expect(inv).toEqual({ fish: 1 });
    expect(eat(40, inv, 'fish')).toEqual({ ok: true, fullness: 40 + HUNGER.food.fish });
    expect(inv).toEqual({});
    expect(eat(40, inv, 'yam')).toMatchObject({ ok: false, reason: 'missing' });
  });

  it('a yam-and-fish meal is worth more than both alone', () => {
    const inv = { yam: 1, fish: 1 };
    const r = eat(10, inv, 'meal');
    expect(r.fullness).toBe(10 + HUNGER.food.yam + HUNGER.food.fish + HUNGER.mealBonus);
    expect(inv).toEqual({});
  });

  it('caps at full, refuses when stuffed, and refuses inedible goods', () => {
    expect(eat(90, { yam: 1 }, 'yam').fullness).toBe(HUNGER.max);
    expect(eat(99, { yam: 1 }, 'yam')).toMatchObject({ ok: false, reason: 'full' });
    expect(eat(20, { beads: 1 }, 'beads')).toMatchObject({ ok: false, reason: 'inedible' });
  });
});
