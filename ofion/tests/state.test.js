import { describe, expect, it } from 'vitest';
import { HUNGER, TIME } from '../src/logic/config.js';
import { trade } from '../src/logic/barter.js';
import { createGame, deserialize, passMinutes, serialize, sleepGame, tick } from '../src/logic/state.js';

describe('game state', () => {
  it('time and hunger move together', () => {
    const g = createGame(1);
    tick(g, 60 * TIME.realMsPerGameMinute);
    expect(g.clock.minute).toBeCloseTo(7 * 60);
    expect(g.fullness).toBeCloseTo(HUNGER.start - 60 * HUNGER.decayPerMinute);
  });

  it('a new day restocks the market and the palms', () => {
    const g = createGame(1);
    g.inv.palmwine = 10;
    trade(g.market, 'adorner', g.inv, 'palmwine', 'camwood');
    g.treesTapped = [0, 1];
    sleepGame(g);
    expect(g.clock.day).toBe(2);
    expect(g.market.traders.adorner.stock.camwood).toBe(2);
    expect(g.treesTapped).toEqual([]);
  });

  it('activities cost time and can roll into the next day', () => {
    const g = createGame(1);
    g.clock.minute = 23 * 60 + 30;
    g.wrestledTonight = ['Bassey'];
    expect(passMinutes(g, 45)).toBe(true);
    expect(g.wrestledTonight).toEqual([]);
  });

  it('saves and loads', () => {
    const g = createGame(5);
    g.inv.beads = 2;
    const back = deserialize(serialize(g));
    expect(back.inv).toEqual(g.inv);
    expect(typeof back.rng).toBe('function');
    expect(deserialize('{"v":0}')).toBeNull();
  });
});
