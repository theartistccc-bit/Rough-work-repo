import { describe, expect, it } from 'vitest';
import { TIME } from '../src/logic/config.js';
import {
  advance, createClock, formatClock, isContestTime, isFestivalDay, isMarketOpen, isMoonlightPlay,
  lightLevel, phaseAt, sleep,
} from '../src/logic/dayCycle.js';

const h = (hh, mm = 0) => hh * 60 + mm;

describe('day cycle', () => {
  it('starts on day 1 at dawn-ish 06:00', () => {
    expect(createClock()).toEqual({ day: 1, minute: h(6) });
  });

  it('advances game minutes from real time and rolls over midnight', () => {
    const c = createClock(1, h(23, 50));
    const days = advance(c, 20 * TIME.realMsPerGameMinute);
    expect(days).toBe(1);
    expect(c).toEqual({ day: 2, minute: 10 });
    expect(advance(c, 0)).toBe(0);
  });

  it('a full game day lasts six real minutes', () => {
    expect((24 * 60 * TIME.realMsPerGameMinute) / 1000).toBe(360);
  });

  it('names the phases', () => {
    expect(phaseAt(h(3))).toBe('night');
    expect(phaseAt(h(6))).toBe('dawn');
    expect(phaseAt(h(12))).toBe('day');
    expect(phaseAt(h(18, 30))).toBe('dusk');
    expect(phaseAt(h(21))).toBe('night');
  });

  it('light rises through dawn and falls through dusk', () => {
    expect(lightLevel(h(2))).toBe(0);
    expect(lightLevel(h(6))).toBeCloseTo(0.5);
    expect(lightLevel(h(12))).toBe(1);
    expect(lightLevel(h(18, 45))).toBeCloseTo(0.5);
    expect(lightLevel(h(22))).toBe(0);
    for (let m = h(5); m < h(7); m += 5) expect(lightLevel(m + 5)).toBeGreaterThanOrEqual(lightLevel(m));
  });

  it('moonlight play runs from 20:00 to midnight; the market by day', () => {
    expect(isMoonlightPlay(h(19, 59))).toBe(false);
    expect(isMoonlightPlay(h(20))).toBe(true);
    expect(isMoonlightPlay(h(23, 30))).toBe(true);
    expect(isMoonlightPlay(h(2))).toBe(false);
    expect(isMarketOpen(h(9))).toBe(true);
    expect(isMarketOpen(h(19))).toBe(false);
  });

  it('sleeping wakes you next morning, or this morning if before dawn', () => {
    const night = createClock(2, h(22));
    expect(sleep(night)).toBe(h(8));
    expect(night).toEqual({ day: 3, minute: TIME.wakeMinute });
    const early = createClock(3, h(2));
    expect(sleep(early)).toBe(h(4));
    expect(early).toEqual({ day: 3, minute: TIME.wakeMinute });
  });

  it('the festival falls every fourth day, with the contest in the late afternoon', () => {
    expect([1, 2, 3, 4, 5, 8].map((d) => isFestivalDay(d))).toEqual([false, false, false, true, false, true]);
    expect(isContestTime(4, h(17))).toBe(true);
    expect(isContestTime(4, h(12))).toBe(false);
    expect(isContestTime(3, h(17))).toBe(false);
  });

  it('formats the clock', () => {
    expect(formatClock({ day: 2, minute: h(7, 5.9) })).toBe('Day 2 · 07:05');
  });
});
