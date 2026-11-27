import { describe, expect, it } from 'vitest';
import { BELT, beltLean, beltMove, createBeltClimb, stepBelt } from '../src/art/beltClimb.js';

describe('tapper belt climb', () => {
  it('alternates: hitch the belt up, then step the feet up to the new height', () => {
    const s = createBeltClimb();
    beltMove(s, 0.3, false);
    expect(s.beltTarget).toBe(BELT.high);
    expect(s.feetTarget).toBe(0); // feet wait for the next move
    beltMove(s, 0.6, false);
    expect(s.feetTarget).toBe(0.6);
    expect(s.beltTarget).toBe(BELT.low);
  });

  it('a slip drops the belt and loses the hitch', () => {
    const s = createBeltClimb();
    beltMove(s, 0.3, false);
    beltMove(s, 0.3, true);
    expect(s.beltTarget).toBe(BELT.low);
    expect(s.moves).toBe(0);
  });

  it('leans back hard with the belt low, comes in closer with it hitched high', () => {
    expect(beltLean(BELT.low)).toBe(BELT.leanLow);
    expect(beltLean(BELT.high)).toBe(BELT.leanHigh);
    expect(beltLean(BELT.low)).toBeGreaterThan(beltLean(BELT.high));
  });

  it('feet and belt ease toward their targets', () => {
    const s = createBeltClimb();
    s.feetTarget = 1;
    stepBelt(s, 70);
    expect(s.feet).toBeGreaterThan(0);
    expect(s.feet).toBeLessThan(1);
    for (let i = 0; i < 30; i++) stepBelt(s, 50);
    expect(s.feet).toBeCloseTo(1, 2);
  });
});
