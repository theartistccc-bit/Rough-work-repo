import { describe, expect, it } from 'vitest';
import { ACTIVITIES } from '../src/logic/config.js';
import {
  canCook, cookSoup, createGather, createPaddle, eatSoup, goodHeat, isOnBeat, moveHand, pick, poundGain,
  shareSoup, stepGather, stepPaddle, stroke, upriverOpen,
} from '../src/logic/activities.js';
import { createMarket, quote } from '../src/logic/barter.js';

describe('periwinkle gathering', () => {
  it('shells appear, fade, and can be picked when the hand is under them', () => {
    const s = createGather();
    stepGather(s, 300, () => 0.5); // first shell at the middle
    expect(s.shells).toHaveLength(1);
    expect(pick(s)).toBe(1);
    expect(s.got).toBe(1);
    stepGather(s, ACTIVITIES.periwinkle.spawnMs, () => 0); // next shell far left
    expect(pick(s)).toBe(0); // hand is in the middle
    for (let i = 0; i < 10; i++) moveHand(s, -1);
    expect(s.hand).toBe(0);
    expect(pick(s)).toBe(1);
  });

  it('shells vanish if left too long, and the tide ends the gathering', () => {
    const s = createGather();
    stepGather(s, 300, () => 0.9);
    stepGather(s, ACTIVITIES.periwinkle.lifeMs + 10, () => 0.1);
    expect(s.shells.every((sh) => sh.x !== 0.9)).toBe(true);
    stepGather(s, ACTIVITIES.periwinkle.durationMs, () => 0.5);
    expect(s.done).toBe(true);
    expect(pick(s)).toBe(0);
  });
});

describe('pounding yam', () => {
  it('strikes count only on the beat', () => {
    expect(isOnBeat(0)).toBe(true);
    expect(isOnBeat(ACTIVITIES.pound.beatMs - 50)).toBe(true);
    expect(isOnBeat(ACTIVITIES.pound.beatMs / 2)).toBe(false);
  });

  it('a well-pounded bowl fills more than a plain yam', () => {
    const { base, bonus, beats } = ACTIVITIES.pound;
    expect(poundGain(0)).toBe(base);
    expect(poundGain(beats)).toBe(base + bonus);
    expect(poundGain(beats / 2)).toBe(base + bonus / 2);
  });
});

describe('edikang ikong soup', () => {
  it('needs periwinkle, fish and palm oil, and uses them up', () => {
    expect(canCook({ periwinkle: 1, fish: 1 })).toBe(false);
    const inv = { periwinkle: 2, fish: 1, palmoil: 1 };
    const r = cookSoup(inv, 3);
    expect(r).toMatchObject({ ok: true, quality: 1, gain: ACTIVITIES.soup.base + ACTIVITIES.soup.bonus });
    expect(inv).toEqual({ periwinkle: 1 });
    expect(cookSoup(inv, 3)).toEqual({ ok: false, reason: 'missing' });
  });

  it('good heat makes better soup; eating caps at full; sharing warms Ini', () => {
    expect(goodHeat(0.6)).toBe(true);
    expect(goodHeat(0.2)).toBe(false);
    const poor = cookSoup({ periwinkle: 1, fish: 1, palmoil: 1 }, 0);
    expect(poor.gain).toBe(ACTIVITIES.soup.base);
    expect(eatSoup(90, poor)).toBe(100);
    expect(shareSoup(30, { quality: 1 })).toBe(30 + ACTIVITIES.soup.shareAffection);
    expect(shareSoup(30, { quality: 0 })).toBe(30 + ACTIVITIES.soup.shareAffection / 2);
  });
});

describe('paddling upriver', () => {
  it('alternating strokes carry you there; one side only stalls you', () => {
    const good = createPaddle();
    const bad = createPaddle();
    for (let i = 0; i < 400 && !good.done; i++) {
      stroke(good, i % 2 ? 'left' : 'right');
      stroke(bad, 'left');
      stepPaddle(good, 330);
      stepPaddle(bad, 330);
    }
    expect(good.done).toBe(true);
    expect(bad.dist).toBeLessThan(0.3);
  });

  it('the canoe leaves only in the morning and early afternoon', () => {
    expect(upriverOpen(9 * 60)).toBe(true);
    expect(upriverOpen(16 * 60)).toBe(false);
  });

  it('upriver traders give beads and camwood for less fish than the village adorner', () => {
    const m = createMarket();
    expect(quote(m, 'ekpo', 'fish', 'beads')).toBeLessThan(quote(m, 'adorner', 'fish', 'beads'));
    expect(quote(m, 'ekpo', 'fish', 'camwood')).toBeLessThan(quote(m, 'adorner', 'fish', 'camwood'));
  });
});
