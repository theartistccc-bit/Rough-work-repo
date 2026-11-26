import { describe, expect, it } from 'vitest';
import { CONTEST } from '../src/logic/config.js';
import {
  adornmentScore, adornmentsUsed, craftScore, playerEntry, rank, rivalEntries, spiritScore, total,
} from '../src/logic/contest.js';
import { makeRng } from '../src/logic/rng.js';

describe('contest scoring', () => {
  it('craft follows plaiting accuracy, with the style bonus only for good work', () => {
    expect(craftScore(0.5, 'ridges')).toBe(5);
    expect(craftScore(0.9, 'crown')).toBe(10); // 9 + 1.6, capped at 10
    expect(craftScore(0.79, 'crown')).toBe(7.9); // under the bonus line
    expect(craftScore(0.8, 'crest')).toBe(8.8);
    expect(craftScore(0, 'ridges')).toBe(0);
  });

  it('adornments add up but wasted extras beyond each cap do not count', () => {
    expect(adornmentScore({})).toBe(0);
    expect(adornmentScore({ thread: 1 })).toBe(1.5);
    expect(adornmentScore({ thread: 5 })).toBe(3);
    expect(adornmentScore({ thread: 2, beads: 3, camwood: 1, comb: 1 })).toBe(10); // 11 capped
    expect(adornmentsUsed({ thread: 5, beads: 1, fish: 4 })).toEqual({ thread: 2, beads: 1 });
  });

  it('spirit comes from Ini\'s affection and your renown', () => {
    expect(spiritScore(0, 0)).toBe(0);
    expect(spiritScore(100, 10)).toBe(10);
    expect(spiritScore(50, 4)).toBe(4.7); // 3.5 + 1.2
  });

  it('total is the weighted sum out of 100', () => {
    expect(total({ craft: 10, adornment: 10, spirit: 10 })).toBe(100);
    expect(total({ craft: 8, adornment: 6, spirit: 5 })).toBe(66.5); // 36 + 18 + 12.5
    const w = CONTEST.weights;
    expect(w.craft + w.adornment + w.spirit).toBeCloseTo(1);
  });

  it('builds the player entry from the plait, the hair goods and the courtship', () => {
    const e = playerEntry({ accuracy: 0.9, styleId: 'crest', items: { thread: 2, camwood: 1 }, affection: 60, renown: 4 });
    expect(e).toMatchObject({ craft: 9.8, adornment: 5, spirit: 5.4, player: true });
    expect(e.total).toBe(total(e));
  });

  it('three rivals, seeded and close to their profiles', () => {
    const a = rivalEntries(makeRng(7));
    const b = rivalEntries(makeRng(7));
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    a.forEach((r, i) => {
      const p = CONTEST.rivals[i];
      expect(Math.abs(r.craft - p.craft)).toBeLessThanOrEqual(CONTEST.jitter + 0.05);
      expect(Math.abs(r.adornment - p.adornment)).toBeLessThanOrEqual(CONTEST.jitter + 0.05);
    });
  });

  it('a careless entry loses and a well-prepared one can win', () => {
    const rivals = rivalEntries(makeRng(3));
    const lazy = playerEntry({ accuracy: 0.4, styleId: 'ridges', items: {}, affection: 20, renown: 0 });
    const ready = playerEntry({ accuracy: 0.95, styleId: 'crown', items: { thread: 2, beads: 3, camwood: 1, comb: 1 }, affection: 75, renown: 6 });
    expect(rank([...rivals, lazy]).at(-1).player).toBe(true);
    expect(rank([...rivals, ready])[0].player).toBe(true);
  });

  it('ranks by total, then craft, then name', () => {
    const r = rank([
      { name: 'B', total: 50, craft: 5 },
      { name: 'A', total: 50, craft: 5 },
      { name: 'C', total: 50, craft: 7 },
      { name: 'D', total: 60, craft: 1 },
    ]);
    expect(r.map((e) => e.name)).toEqual(['D', 'C', 'A', 'B']);
  });
});
