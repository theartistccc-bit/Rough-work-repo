// Every tunable number in the game lives here, so the rules can be matched
// to the original prototype without touching game code. Tests read these
// values too, so change a number here and the tests follow it.

export const TIME = {
  realMsPerGameMinute: 250, // 1 game day = 360 real seconds
  startDay: 1,
  startMinute: 6 * 60,
  wakeMinute: 6 * 60,
  dawn: [5 * 60, 7 * 60],
  dusk: [18 * 60, 19 * 60 + 30],
  moonlightPlay: [20 * 60, 24 * 60 - 1], // tales and wrestling in the square
  market: [8 * 60, 17 * 60],
  festivalEvery: 4, // festival on day 4, 8, 12...
  festivalContest: [16 * 60, 19 * 60],
};

export const HUNGER = {
  max: 100,
  start: 70,
  decayPerMinute: 0.05, // full to empty in ~33 game hours when idle
  walkMultiplier: 1.6,
  sleepDecayPerMinute: 0.02,
  hungryBelow: 25,
  hungrySpeed: 0.8,
  starvingSpeed: 0.5,
  fullAbove: 95, // cannot eat more
  actionCost: { climb: 8, wrestle: 10, cast: 1, plait: 3 },
  // the starving cannot climb a palm or wrestle
  blockedWhenStarving: ['climb', 'wrestle'],
  food: { yam: 30, fish: 20, plantain: 15, periwinkle: 10 },
  // eating roast yam with fish together is a proper meal
  mealBonus: 10,
};

// Goods only. There is no money, cowrie or currency anywhere in the game.
// "worth" is a hidden barter weight and is never shown to the player.
export const GOODS = {
  fish: { label: 'Fish', worth: 2, edible: true },
  yam: { label: 'Yam', worth: 3, edible: true },
  plantain: { label: 'Plantain', worth: 2, edible: true },
  periwinkle: { label: 'Periwinkle', worth: 1, edible: true },
  palmwine: { label: 'Palm wine', worth: 4 },
  palmoil: { label: 'Palm oil', worth: 5 },
  thread: { label: 'Raffia thread', worth: 3 },
  beads: { label: 'Coral beads', worth: 8 },
  camwood: { label: 'Camwood', worth: 6 },
  comb: { label: 'Wooden comb', worth: 5 },
  pot: { label: 'Clay pot', worth: 6 },
};

export const BARTER = {
  // each unit a trader takes in today lowers how much they want it
  demandDropPerUnit: 0.05,
  minDemand: 0.5,
  traders: {
    fishwife: {
      name: 'Mma Edet',
      trade: 'creek goods',
      wants: { yam: 1.2, palmwine: 1.1, plantain: 1.0 },
      offers: { periwinkle: 8, fish: 4, palmoil: 3 },
      markup: 1.0,
    },
    farmer: {
      name: 'Ete Okon',
      trade: 'farm goods',
      wants: { fish: 1.2, palmwine: 1.3, periwinkle: 1.0 },
      offers: { yam: 6, plantain: 6, pot: 1 },
      markup: 1.0,
    },
    adorner: {
      name: 'Eka Nse',
      trade: 'adornments',
      wants: { palmwine: 1.2, palmoil: 1.1, fish: 0.9, yam: 0.9 },
      offers: { thread: 4, beads: 3, camwood: 2, comb: 2 },
      markup: 1.25,
    },
    // upriver, a paddle away: inland people want creek food and part with beads and camwood more cheaply
    ekpo: {
      name: 'Ete Ekpo',
      trade: 'beads and camwood from inland',
      place: 'upriver',
      wants: { fish: 1.4, periwinkle: 1.5, palmoil: 1.2 },
      offers: { beads: 4, camwood: 3, thread: 4 },
      markup: 0.9,
    },
    uduak: {
      name: 'Eka Uduak',
      trade: 'pots, combs and yams',
      place: 'upriver',
      wants: { periwinkle: 1.3, fish: 1.2, palmwine: 1.0 },
      offers: { comb: 3, pot: 2, yam: 6 },
      markup: 1.0,
    },
  },
};

export const START_INVENTORY = { yam: 2, fish: 1 };

export const FISHING = {
  biteDelayMs: [1500, 4000],
  biteWindowMs: 700,
  dawnDuskWindowBonusMs: 300,
  catchQty: 1,
};

export const CLIMB = {
  stepGain: 0.08,
  slipLoss: 0.05,
  yieldPerTree: 1,
  trees: 3,
};

export const WRESTLE = {
  rounds: 3,
  sweetSpot: [0.42, 0.58], // marker position that counts as a clean throw
  renownPerWin: 2,
  opponents: [
    { name: 'Bassey', skill: 0.45 },
    { name: 'Etim', skill: 0.6 },
    { name: 'Asuquo', skill: 0.75 },
  ],
};

export const TALES = [
  {
    id: 'tortoise-feast',
    title: 'Tortoise and the Feast in the Sky',
    lines: [
      'When the birds flew up to a feast in the sky, Tortoise begged a feather from each.',
      'He named himself "All of You", so when food came for all of you, he ate it all.',
      'The birds took back their feathers. Tortoise fell, and his shell cracked in pieces.',
      'That is why his back is patched to this day. Greed keeps no friends.',
    ],
  },
  {
    id: 'tortoise-drum',
    title: 'The Drum That Would Not Stop',
    lines: [
      'A boy found a drum by the creek that fed whoever beat it once.',
      'His greedy uncle beat it twice, then ten times, and it gave him only stinging ants.',
      'Take what is given with thanks, and know when once is enough.',
    ],
  },
  {
    id: 'moon-and-creek',
    title: 'Why the Moon Visits the Creek',
    lines: [
      'Moon and Creek were friends. Creek could not climb, so Moon came down to visit.',
      'Each night Moon lays her light on the water so Creek is never alone.',
      'A true friend comes to where you are.',
    ],
  },
];

export const COURTSHIP = {
  name: 'Ini',
  talkBase: 4,
  talkPerWisdom: 1,
  talkMax: 10,
  gifts: { beads: 12, camwood: 10, comb: 8, fish: 4, palmwine: 3, plantain: 2 },
  repeatGiftFactor: 0.5, // the same gift twice in a day means less
  stages: [
    { min: 0, label: 'stranger' },
    { min: 20, label: 'acquaintance' },
    { min: 45, label: 'friend' },
    { min: 70, label: 'beloved' },
  ],
  contestMinAffection: 20, // Ini lets you dress her hair only if she knows you
  betrothalAffection: 70,
};

export const CONTEST = {
  weights: { craft: 0.45, adornment: 0.3, spirit: 0.25 },
  adornment: {
    thread: { per: 1.5, max: 2 },
    beads: { per: 1.5, max: 3 },
    camwood: { per: 2, max: 1 },
    comb: { per: 1.5, max: 1 },
  },
  spiritAffectionShare: 0.7,
  spiritRenownShare: 0.3,
  jitter: 0.5, // rivals vary by up to this much per criterion
  styles: [
    { id: 'ridges', label: 'Threaded ridges', length: 6, bonus: 0 },
    { id: 'crest', label: 'High crested coils', length: 9, bonus: 0.8 },
    { id: 'crown', label: 'Split crown with bead drops', length: 12, bonus: 1.6 },
  ],
  bonusAccuracy: 0.8,
  rivals: [
    { name: 'Affiong', styler: 'her aunt', craft: 7.5, adornment: 4, spirit: 5 },
    { name: 'Nkoyo', styler: 'her sister', craft: 5, adornment: 8, spirit: 5.5 },
    { name: 'Ekaette', styler: 'her mother', craft: 6.5, adornment: 6.5, spirit: 6.5 },
  ],
};

// ---- activities added with the new scenes ----
export const ACTIVITIES = {
  periwinkle: { durationMs: 15000, spawnMs: 900, lifeMs: 2200, reach: 0.08, handSpeed: 0.12 },
  pound: { beats: 8, beatMs: 700, windowMs: 140, base: 30, bonus: 20 },
  soup: { needs: { periwinkle: 1, fish: 1, palmoil: 1 }, goodHeat: [0.45, 0.75], base: 45, bonus: 35, shareAffection: 10 },
  paddle: { strokeGain: 0.14, sameSideFactor: 0.5, decayPerSec: 0.55, distPerSpeedSec: 0.09, maxSpeed: 1, minutesEachWay: 60 },
  upriverOpen: [8 * 60, 14 * 60], // leave early enough to trade and come back
};
