import { describe, expect, it } from 'vitest';
import { armSide, climbArms, findArmCuts, paddleArms } from '../src/art/arms.js';

// 60x120 figure: torso x 18..41, arms x 8..13 and 46..51 from y 30 to 66, gaps between
const figure = (x, y) => {
  if (y < 30) return x >= 18 && x < 42;
  if (y <= 66) return (x >= 8 && x < 14) || (x >= 18 && x < 42) || (x >= 46 && x < 52);
  return x >= 18 && x < 42;
};

describe('arms cut from the picture', () => {
  it('finds a cut line in each gap between arm and torso', () => {
    const c = findArmCuts(figure, 60, 120);
    expect(c.left).toBeGreaterThanOrEqual(14);
    expect(c.left).toBeLessThanOrEqual(17);
    expect(c.right).toBeGreaterThanOrEqual(42);
    expect(c.right).toBeLessThanOrEqual(45);
  });

  it('falls back to sensible lines when the arms touch the body', () => {
    const c = findArmCuts((x, y) => x >= 10 && x < 50 && y > 10, 60, 120);
    expect(c.left).toBe(18);
    expect(c.right).toBe(42);
  });

  it('sorts pixels into left arm, right arm or body', () => {
    const c = { left: 15, right: 44, top: 30, bottom: 66 };
    expect(armSide(10, 40, c)).toBe('left');
    expect(armSide(48, 40, c)).toBe('right');
    expect(armSide(30, 40, c)).toBeNull();
    expect(armSide(10, 90, c)).toBeNull(); // below the hands: the wrapper stays on the body
  });

  it('climbing: hands stay high, swapping which one reaches', () => {
    const start = climbArms(0, 1);
    const end = climbArms(1, 1);
    expect(end.right).toBeGreaterThan(start.right); // the right hand reaches up
    expect(end.left).toBeLessThan(start.left); // the left pulls down
    expect(Math.min(end.left, end.right)).toBeGreaterThan(90); // both above the shoulder
  });

  it('paddling: reach forward, pull back past the hip, recover', () => {
    expect(paddleArms(0).bottom).toBeCloseTo(55);
    expect(paddleArms(0.65).bottom).toBeCloseTo(-30);
    expect(paddleArms(1).bottom).toBeCloseTo(55);
    expect(paddleArms(0.3).top).toBeGreaterThan(paddleArms(0.3).bottom);
  });
});
