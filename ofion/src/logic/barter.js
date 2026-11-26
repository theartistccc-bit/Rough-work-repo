import { BARTER, GOODS } from './config.js';
import { add, has, remove } from './inventory.js';

/** Fresh market for a new day: demand and stock reset. */
export function createMarket(cfg = BARTER) {
  const traders = {};
  for (const [id, t] of Object.entries(cfg.traders)) {
    traders[id] = { id, received: {}, stock: { ...t.offers } };
  }
  return { traders };
}

export function demand(market, traderId, good, cfg = BARTER) {
  const base = cfg.traders[traderId].wants[good];
  if (base == null) return 0;
  const taken = market.traders[traderId].received[good] ?? 0;
  return Math.max(cfg.minDemand, base * (1 - cfg.demandDropPerUnit * taken));
}

/**
 * How many units of `give` this trader asks for one unit of `get`.
 * Returns null if the trader won't take `give` or has no `get` left.
 */
export function quote(market, traderId, give, get, cfg = BARTER, goods = GOODS) {
  const t = cfg.traders[traderId];
  const d = demand(market, traderId, give, cfg);
  if (!d || (market.traders[traderId].stock[get] ?? 0) <= 0) return null;
  const units = (goods[get].worth * t.markup) / (goods[give].worth * d);
  return Math.max(1, Math.ceil(units - 1e-9));
}

/** Every trade a trader would make with what the player carries. */
export function offersFor(market, traderId, inv, cfg = BARTER) {
  const t = cfg.traders[traderId];
  const out = [];
  for (const get of Object.keys(t.offers)) {
    for (const give of Object.keys(t.wants)) {
      const n = quote(market, traderId, give, get, cfg);
      if (n != null) out.push({ give, giveQty: n, get, getQty: 1, affordable: has(inv, give, n) });
    }
  }
  return out;
}

/** Swap goods for goods. Mutates inventory and market. */
export function trade(market, traderId, inv, give, get, cfg = BARTER) {
  const n = quote(market, traderId, give, get, cfg);
  if (n == null) return { ok: false, reason: 'refused' };
  if (!has(inv, give, n)) return { ok: false, reason: 'not-enough', need: n };
  remove(inv, give, n);
  add(inv, get, 1);
  const tr = market.traders[traderId];
  tr.received[give] = (tr.received[give] ?? 0) + n;
  tr.stock[get] -= 1;
  return { ok: true, gave: n };
}
