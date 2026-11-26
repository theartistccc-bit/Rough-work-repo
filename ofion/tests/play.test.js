import { describe, expect, it } from 'vitest';
import { COURTSHIP, WRESTLE } from '../src/logic/config.js';
import { createCourtship, gift, stage, talk } from '../src/logic/courtship.js';
import {
  climbInput, createClimb, createFishing, createPlait, markerAt, plaitAccuracy, plaitInput,
  pullFishing, stepFishing, throwQuality, wrestleMatch, wrestleRound,
} from '../src/logic/minigames.js';
import { makeRng } from '../src/logic/rng.js';

describe('fishing', () => {
  it('pulling inside the bite window catches; early or late does not', () => {
    const f = createFishing(() => 0); // bite at 1500ms
    expect(stepFishing(f, 1000)).toBe('waiting');
    expect(stepFishing(f, 600)).toBe('biting');
    expect(pullFishing(f)).toBe('caught');

    const early = createFishing(() => 0);
    expect(pullFishing(early)).toBe('early');

    const late = createFishing(() => 0);
    stepFishing(late, 1500);
    expect(stepFishing(late, 800)).toBe('escaped');
  });

  it('fish bite more forgivingly at dawn and dusk', () => {
    expect(createFishing(() => 0, { dawnOrDusk: true }).window).toBeGreaterThan(createFishing(() => 0).window);
  });
});

describe('palm climbing', () => {
  it('alternating grips climbs, repeating a hand slips', () => {
    const c = createClimb();
    climbInput(c, 'left');
    climbInput(c, 'right');
    expect(c.progress).toBeCloseTo(0.16);
    climbInput(c, 'right');
    expect(c.progress).toBeCloseTo(0.11);
    for (let i = 0; i < 30; i++) climbInput(c, i % 2 ? 'right' : 'left');
    expect(c.done).toBe(true);
  });
});

describe('wrestling', () => {
  it('the marker swings 0..1..0 and the centre gives the best throw', () => {
    expect(markerAt(0)).toBe(0);
    expect(markerAt(500)).toBeCloseTo(0.5);
    expect(markerAt(1500)).toBeCloseTo(0.5);
    expect(throwQuality(0.5)).toBe(1);
    expect(throwQuality(0)).toBe(0);
  });

  it('a clean throw beats a weak wrestler but hunger drags you down', () => {
    expect(wrestleRound(0.9, WRESTLE.opponents[0].skill, 0, 80)).toBe(true);
    expect(wrestleRound(0.5, WRESTLE.opponents[0].skill, 0, 10)).toBe(false);
  });

  it('best of three', () => {
    expect(wrestleMatch([true, true])).toBe('won');
    expect(wrestleMatch([false, true])).toBe('ongoing');
    expect(wrestleMatch([false, true, false])).toBe('lost');
  });
});

describe('plaiting', () => {
  it('pattern length follows the style and accuracy counts matches', () => {
    const p = createPlait(makeRng(1), 'crest');
    expect(p.pattern).toHaveLength(9);
    p.pattern.forEach((m, i) => plaitInput(p, i < 6 ? m : 'wrong'));
    expect(p.done).toBe(true);
    expect(plaitAccuracy(p)).toBeCloseTo(6 / 9);
  });
});

describe('courting Ini', () => {
  it('talking once a day, better with tales heard', () => {
    const c = createCourtship();
    expect(talk(c, 1, 0)).toEqual({ ok: true, gain: COURTSHIP.talkBase });
    expect(talk(c, 1, 0)).toEqual({ ok: false, reason: 'already' });
    expect(talk(c, 2, 3).gain).toBe(COURTSHIP.talkBase + 3);
    expect(talk(c, 3, 99).gain).toBe(COURTSHIP.talkMax);
  });

  it('gifts she likes help; the same gift twice a day helps less', () => {
    const c = createCourtship();
    const inv = { beads: 2, yam: 1 };
    expect(gift(c, 1, inv, 'beads').gain).toBe(12);
    expect(gift(c, 1, inv, 'beads').gain).toBe(6);
    expect(gift(c, 1, inv, 'beads')).toMatchObject({ ok: false, reason: 'missing' });
    expect(gift(c, 1, inv, 'yam')).toMatchObject({ ok: false, reason: 'unwanted' });
    expect(c.affection).toBe(18);
  });

  it('stages of closeness', () => {
    expect(stage(0)).toBe('stranger');
    expect(stage(20)).toBe('acquaintance');
    expect(stage(70)).toBe('beloved');
  });
});
