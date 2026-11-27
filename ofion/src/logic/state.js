import { START_INVENTORY, TIME, HUNGER } from './config.js';
import { advance, createClock, sleep } from './dayCycle.js';
import { decay } from './hunger.js';
import { createInventory } from './inventory.js';
import { createMarket } from './barter.js';
import { createCourtship } from './courtship.js';
import { makeRng } from './rng.js';
import { createStats, createStory } from './story.js';

const SAVE_VERSION = 1;

export function createGame(seed = Date.now() % 100000) {
  const g = {
    v: SAVE_VERSION,
    seed,
    clock: createClock(),
    fullness: HUNGER.start,
    inv: createInventory(START_INVENTORY),
    market: createMarket(),
    courtship: createCourtship(),
    wisdom: 0,
    renown: 0,
    talesHeard: [],
    talesTonight: 0,
    treesTapped: [],
    wrestledTonight: [],
    festivalsEntered: [],
    ending: null,
    story: createStory(),
    stats: createStats(),
  };
  attachRng(g);
  return g;
}

function attachRng(g) {
  // seeded per day so a reload gives the same day
  Object.defineProperty(g, 'rng', {
    value: makeRng(g.seed * 1000 + g.clock.day),
    enumerable: false, writable: true, configurable: true,
  });
}

function onNewDay(g) {
  g.market = createMarket();
  g.treesTapped = [];
  g.wrestledTonight = [];
  g.talesTonight = 0;
  attachRng(g);
}

/** Real-time tick. Returns true if a new day began. */
export function tick(g, dtMs, { walking = false } = {}) {
  const minutes = dtMs / TIME.realMsPerGameMinute;
  g.fullness = decay(g.fullness, minutes, { walking });
  const days = advance(g.clock, dtMs);
  if (days > 0) onNewDay(g);
  return days > 0;
}

/** Time spent on an activity (fishing, climbing...), in game minutes. */
export function passMinutes(g, minutes) {
  return tick(g, minutes * TIME.realMsPerGameMinute);
}

export function sleepGame(g) {
  const before = g.clock.day;
  const slept = sleep(g.clock);
  g.fullness = decay(g.fullness, slept, { sleeping: true });
  if (g.clock.day !== before) onNewDay(g);
  return slept;
}

export const serialize = (g) => JSON.stringify(g);

export function deserialize(json) {
  const g = JSON.parse(json);
  if (g?.v !== SAVE_VERSION) return null;
  g.story ??= createStory(); // saves from before the story existed
  g.stats ??= createStats();
  attachRng(g);
  return g;
}
