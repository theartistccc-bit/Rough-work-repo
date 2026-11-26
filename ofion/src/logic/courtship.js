import { COURTSHIP } from './config.js';
import { clamp } from './rng.js';
import { has, remove } from './inventory.js';

export const createCourtship = () => ({ affection: 0, talkedDay: 0, giftsToday: {}, giftDay: 0 });

export function stage(affection, cfg = COURTSHIP) {
  let s = cfg.stages[0].label;
  for (const st of cfg.stages) if (affection >= st.min) s = st.label;
  return s;
}

/** Talk once per day; tales heard (wisdom) make you better company. */
export function talk(c, day, wisdom, cfg = COURTSHIP) {
  if (c.talkedDay === day) return { ok: false, reason: 'already' };
  const gain = Math.min(cfg.talkMax, cfg.talkBase + wisdom * cfg.talkPerWisdom);
  c.talkedDay = day;
  c.affection = clamp(c.affection + gain, 0, 100);
  return { ok: true, gain };
}

export function gift(c, day, inv, good, cfg = COURTSHIP) {
  const base = cfg.gifts[good];
  if (base == null) return { ok: false, reason: 'unwanted' };
  if (!has(inv, good)) return { ok: false, reason: 'missing' };
  if (c.giftDay !== day) {
    c.giftDay = day;
    c.giftsToday = {};
  }
  const times = c.giftsToday[good] ?? 0;
  const gain = Math.round(base * cfg.repeatGiftFactor ** times);
  remove(inv, good);
  c.giftsToday[good] = times + 1;
  c.affection = clamp(c.affection + gain, 0, 100);
  return { ok: true, gain };
}
