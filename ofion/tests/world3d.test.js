import { describe, expect, it } from 'vitest';
import { GROUND_Y } from '../src/world.js';
import { cameraFor, mixHex, skyAt, sunPosition, toWorldX, toWorldY } from '../src/world3d/layout.js';

describe('3D village layout', () => {
  it('keeps the 2D village order along x and stands feet on the ground', () => {
    expect(toWorldX(800)).toBe(8);
    expect(toWorldX(3200)).toBeGreaterThan(toWorldX(800));
    expect(toWorldY(GROUND_Y)).toBe(0);
    expect(toWorldY(GROUND_Y - 92)).toBeCloseTo(1.75, 1); // a villager's height
  });

  it('the camera rides above and in front, looking at the player', () => {
    const c = cameraFor(1500);
    expect(c.pos[0]).toBe(15);
    expect(c.look[0]).toBe(15);
    expect(c.pos[1]).toBeGreaterThan(c.look[1]);
    expect(c.pos[2]).toBeGreaterThan(c.look[2]);
  });

  it('mixes colours', () => {
    expect(mixHex(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixHex(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixHex(0x000000, 0xff0000, 0.5)).toBe(0x800000);
  });

  it('day is bright and sunlit, night dark and blue, dusk warm', () => {
    const day = skyAt(1);
    const night = skyAt(0);
    expect(day.sunIntensity).toBeGreaterThan(1);
    expect(night.sunIntensity).toBe(0);
    expect(night.night).toBe(1);
    expect(night.sky & 255).toBeGreaterThan((night.sky >> 16) & 255); // bluer than red
    const dusk = skyAt(0.5);
    expect((dusk.sky >> 16) & 255).toBeGreaterThan(dusk.sky & 255); // redder than blue
  });

  it('the sun rises on the left, is high at noon, sets on the right', () => {
    const [x1, y1] = sunPosition(6 * 60, 0);
    const [, yNoon] = sunPosition(12 * 60 + 15, 0);
    const [x2] = sunPosition(18 * 60 + 30, 0);
    expect(x1).toBeLessThan(0);
    expect(x2).toBeGreaterThan(0);
    expect(yNoon).toBeGreaterThan(y1);
  });
});
