import { describe, expect, it } from 'vitest';
import { findLegs, gaitPose } from '../src/art/rig.js';

// a 40x100 figure: body block on top, two legs below y=70 with a gap at x=18..21
const figure = (x, y) => {
  if (y < 70) return x >= 8 && x < 32;
  return (x >= 10 && x < 18) || (x >= 22 && x < 30);
};

describe('walking rig', () => {
  it('finds where the legs separate and the gap between them', () => {
    const r = findLegs(figure, 40, 100);
    expect(r.split).toBeGreaterThanOrEqual(18);
    expect(r.split).toBeLessThanOrEqual(21);
    expect(r.legTop).toBeGreaterThan(60);
    expect(r.legTop).toBeLessThanOrEqual(70);
  });

  it('gives up on a figure without two separate legs', () => {
    const blob = (x) => x >= 8 && x < 32;
    expect(findLegs(blob, 40, 100)).toBeNull();
  });

  it('legs swing opposite; the body rises as a leg passes under it; standing is neutral', () => {
    const p = gaitPose(Math.PI / 2);
    expect(p.front).toBeCloseTo(24);
    expect(p.back).toBeCloseTo(-24);
    expect(gaitPose(Math.PI / 2).bob).toBeCloseTo(0); // legs spread: body lowest
    expect(gaitPose(0).bob).toBeCloseTo(-3.2); // legs together: body highest
    const still = gaitPose(1.2, 0);
    expect([still.front, still.back, still.bob, still.lean].every((v) => Math.abs(v) < 1e-9)).toBe(true);
  });
});
