import { CONTEST } from './config.js';
import { clamp } from './rng.js';

const round1 = (v) => Math.round(v * 10) / 10;

export const styleById = (id, cfg = CONTEST) => cfg.styles.find((s) => s.id === id);

/** Craft 0..10 from plaiting accuracy, plus the style's bonus if done well. */
export function craftScore(accuracy, styleId, cfg = CONTEST) {
  const style = styleById(styleId, cfg);
  const base = clamp(accuracy, 0, 1) * 10;
  const bonus = accuracy >= cfg.bonusAccuracy ? style.bonus : 0;
  return round1(clamp(base + bonus, 0, 10));
}

/** Adornment 0..10 from what is worked into the hair. Extra beyond each cap is wasted. */
export function adornmentScore(items, cfg = CONTEST) {
  let s = 0;
  for (const [good, rule] of Object.entries(cfg.adornment)) {
    s += Math.min(items[good] ?? 0, rule.max) * rule.per;
  }
  return round1(clamp(s, 0, 10));
}

/** How many of each adornment the contest will actually use from an inventory. */
export function adornmentsUsed(inv, cfg = CONTEST) {
  const used = {};
  for (const [good, rule] of Object.entries(cfg.adornment)) {
    const n = Math.min(inv[good] ?? 0, rule.max);
    if (n > 0) used[good] = n;
  }
  return used;
}

/** Spirit 0..10: Ini's confidence (affection) and the stylist's renown. */
export function spiritScore(affection, renown, cfg = CONTEST) {
  const a = (clamp(affection, 0, 100) / 10) * cfg.spiritAffectionShare;
  const r = clamp(renown, 0, 10) * cfg.spiritRenownShare;
  return round1(a + r);
}

export function total({ craft, adornment, spirit }, cfg = CONTEST) {
  const w = cfg.weights;
  return round1((craft * w.craft + adornment * w.adornment + spirit * w.spirit) * 10);
}

export function playerEntry({ accuracy, styleId, items, affection, renown }, cfg = CONTEST) {
  const e = {
    name: 'Ini',
    styler: 'you',
    craft: craftScore(accuracy, styleId, cfg),
    adornment: adornmentScore(items, cfg),
    spirit: spiritScore(affection, renown, cfg),
    player: true,
  };
  e.total = total(e, cfg);
  return e;
}

export function rivalEntries(rng, cfg = CONTEST) {
  const j = () => (rng() * 2 - 1) * cfg.jitter;
  return cfg.rivals.map((r) => {
    const e = {
      name: r.name,
      styler: r.styler,
      craft: round1(clamp(r.craft + j(), 0, 10)),
      adornment: round1(clamp(r.adornment + j(), 0, 10)),
      spirit: round1(clamp(r.spirit + j(), 0, 10)),
    };
    e.total = total(e, cfg);
    return e;
  });
}

/** Highest total first; ties go to better craft, then name. */
export function rank(entries) {
  return [...entries].sort(
    (a, b) => b.total - a.total || b.craft - a.craft || a.name.localeCompare(b.name),
  );
}
