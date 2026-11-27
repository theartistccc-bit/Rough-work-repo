// Where everything stands along the village, left (creek) to right (palm grove).
export const VIEW = { w: 960, h: 540 };
export const GROUND_Y = 432; // feet line
export const WORLD_W = 3320;
export const WALK_SPEED = 190; // px per second
export const REACH = 70; // how close you must stand to act

export const PLACES = {
  creekEdge: 470,
  fishingSpot: 400,
  periwinkles: 210,
  canoe: 300,
  home: 800,
  traders: { fishwife: 1230, farmer: 1440, adorner: 1650 },
  elder: 1960,
  judges: 2080,
  ring: 2200,
  iniDay: 2520,
  iniNight: 2060,
  iniHut: 2650,
  palms: [2900, 3050, 3200],
  playerStart: 860,
};

export const ZONES = [
  { from: 0, to: 520, name: 'The creek' },
  { from: 520, to: 1080, name: 'Your compound' },
  { from: 1080, to: 1800, name: 'Market square' },
  { from: 1800, to: 2380, name: 'Village square' },
  { from: 2380, to: 2780, name: "Ini's compound" },
  { from: 2780, to: WORLD_W, name: 'Palm grove' },
];

export const zoneAt = (x) => ZONES.find((z) => x >= z.from && x < z.to)?.name ?? '';
