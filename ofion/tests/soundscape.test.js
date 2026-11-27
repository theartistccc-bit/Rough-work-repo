import { describe, expect, it } from 'vitest';
import { soundscape } from '../src/logic/soundscape.js';

const h = (hh, mm = 0) => hh * 60 + mm;

describe('soundscape', () => {
  it('birds and day music by day, crickets and frogs by night', () => {
    expect(soundscape(1, h(12), 1000)).toMatchObject({ ambience: ['birds'], music: 'day' });
    expect(soundscape(1, h(2), 1000)).toMatchObject({ ambience: ['crickets', 'frogs'], music: 'night' });
  });

  it('moonlight drums only in the square during moonlight play', () => {
    expect(soundscape(1, h(21), 2100).music).toBe('moonlight');
    expect(soundscape(1, h(21), 900).music).toBe('night');
    expect(soundscape(1, h(3), 2100).music).toBe('night');
  });

  it('festival music during the contest, anywhere in the village', () => {
    expect(soundscape(4, h(17), 500).music).toBe('festival');
    expect(soundscape(3, h(17), 500).music).toBe('day');
  });

  it('dawn and dusk are quiet between songs', () => {
    expect(soundscape(1, h(6), 1000).music).toBeNull();
    expect(soundscape(1, h(6), 1000).ambience).toContain('crickets');
  });

  it('the creek is loud at the jetty and fades inland; the fire is heard near the square at night', () => {
    expect(soundscape(1, h(12), 300).creek).toBe(1);
    expect(soundscape(1, h(12), 2000).creek).toBe(0);
    expect(soundscape(1, h(21), 2090).fire).toBeGreaterThan(0.9);
    expect(soundscape(1, h(12), 2090).fire).toBe(0);
    expect(soundscape(1, h(21), 3000).fire).toBe(0);
  });
});
