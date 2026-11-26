import { describe, expect, it } from 'vitest';
import { BARTER, GOODS } from '../src/logic/config.js';
import { createMarket, demand, offersFor, quote, trade } from '../src/logic/barter.js';
import { createInventory } from '../src/logic/inventory.js';

describe('barter rates', () => {
  it('quotes goods-for-goods rates from worth, demand and markup, rounded up', () => {
    const m = createMarket();
    // fishwife: 1 fish (2) for yam (3 x 1.2 demand) -> 0.56 -> at least 1
    expect(quote(m, 'fishwife', 'yam', 'fish')).toBe(1);
    // fishwife: palm oil 5 / (palm wine 4 x 1.1) = 1.14 -> 2
    expect(quote(m, 'fishwife', 'palmwine', 'palmoil')).toBe(2);
    // farmer: yam 3 / (fish 2 x 1.2) = 1.25 -> 2 fish per yam
    expect(quote(m, 'farmer', 'fish', 'yam')).toBe(2);
    // adorner (markup 1.25): beads 10 / (palm wine 4 x 1.2) = 2.08 -> 3
    expect(quote(m, 'adorner', 'palmwine', 'beads')).toBe(3);
    // adorner: beads 10 / (fish 2 x 0.9) = 5.56 -> 6 fish
    expect(quote(m, 'adorner', 'fish', 'beads')).toBe(6);
    expect(quote(m, 'adorner', 'palmwine', 'camwood')).toBe(2);
  });

  it('refuses goods a trader does not want', () => {
    const m = createMarket();
    expect(quote(m, 'farmer', 'yam', 'plantain')).toBeNull();
    const inv = createInventory({ yam: 10 });
    expect(trade(m, 'farmer', inv, 'yam', 'plantain')).toEqual({ ok: false, reason: 'refused' });
    expect(inv.yam).toBe(10);
  });

  it('swaps goods and refuses when you carry too little', () => {
    const m = createMarket();
    const inv = createInventory({ fish: 3 });
    expect(trade(m, 'farmer', inv, 'fish', 'yam')).toEqual({ ok: true, gave: 2 });
    expect(inv).toEqual({ fish: 1, yam: 1 });
    expect(trade(m, 'farmer', inv, 'fish', 'yam')).toEqual({ ok: false, reason: 'not-enough', need: 2 });
    expect(inv).toEqual({ fish: 1, yam: 1 });
  });

  it('wants a good less the more of it a trader takes in a day, down to a floor', () => {
    const m = createMarket();
    const before = demand(m, 'adorner', 'fish');
    m.traders.adorner.received.fish = 6;
    expect(demand(m, 'adorner', 'fish')).toBeCloseTo(before * 0.7);
    expect(quote(m, 'adorner', 'fish', 'beads')).toBe(8);
    m.traders.adorner.received.fish = 100;
    expect(demand(m, 'adorner', 'fish')).toBe(BARTER.minDemand);
  });

  it('runs out of stock and resets with a new day', () => {
    const m = createMarket();
    const inv = createInventory({ palmwine: 20 });
    for (let i = 0; i < BARTER.traders.adorner.offers.camwood; i++) {
      expect(trade(m, 'adorner', inv, 'palmwine', 'camwood').ok).toBe(true);
    }
    expect(quote(m, 'adorner', 'palmwine', 'camwood')).toBeNull();
    expect(quote(createMarket(), 'adorner', 'palmwine', 'camwood')).toBe(2);
  });

  it('lists offers and marks which ones you can afford', () => {
    const m = createMarket();
    const offers = offersFor(m, 'farmer', { fish: 2 });
    const yamForFish = offers.find((o) => o.give === 'fish' && o.get === 'yam');
    expect(yamForFish).toMatchObject({ giveQty: 2, getQty: 1, affordable: true });
    expect(offers.find((o) => o.give === 'palmwine').affordable).toBe(false);
  });

  it('has no money: no currency goods, and every trade is goods for goods', () => {
    const banned = /money|cowrie|coin|manilla|naira|cash|currency|gold/i;
    for (const [id, g] of Object.entries(GOODS)) {
      expect(id).not.toMatch(banned);
      expect(g.label).not.toMatch(banned);
    }
    for (const t of Object.values(BARTER.traders)) {
      for (const id of [...Object.keys(t.wants), ...Object.keys(t.offers)]) {
        expect(GOODS[id]).toBeDefined();
      }
    }
  });
});
