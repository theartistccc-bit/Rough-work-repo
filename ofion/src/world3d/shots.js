// Story moments filmed in the 3D village: where the camera moves, the time of day, who stands where.
// Positions are world units (village pixels / 100). Kept free of three.js.
import { PLACES } from '../world.js';
import { toWorldX } from './layout.js';

const H = (h, m = 0) => h * 60 + m;
const JETTY = toWorldX(PLACES.fishingSpot) - 1.1; // centre of the jetty deck
const DECK = 0.13; // deck height
const INI_HUT = toWorldX(PLACES.iniHut);
const FIRE = toWorldX(PLACES.elder) + 0.8;
const SQUARE = toWorldX(PLACES.ring);

export const SHOTS_3D = {
  // dawn on the creek: the fisherman on the jetty, mangroves behind
  creek: {
    minute: H(6, 30), ms: 9000,
    cam: { from: [[JETTY + 2.7, 1.5, 5.2], [JETTY + 0.1, 1.2, -1]], to: [[JETTY + 2.0, 1.35, 4.4], [JETTY + 0.2, 1.15, -1]] },
    actors: [{ key: 'player', x: JETTY + 0.5, y: DECK, z: 0.5 }],
  },
  // the full moon rising over still water
  moon: {
    minute: H(21), ms: 9000, moon: [JETTY - 3, 6.5, -32],
    cam: { from: [[JETTY + 0.6, 0.55, 3], [JETTY - 2.6, 3.4, -30]], to: [[JETTY + 0.6, 0.85, 3], [JETTY - 2.6, 4.2, -30]] },
    actors: [],
  },
  // Ini outside her family's house, the fisherman a little way off
  bank: {
    minute: H(15, 30), ms: 9000,
    cam: { from: [[INI_HUT - 3.3, 1.7, 5.5], [INI_HUT - 0.9, 1.3, -2]], to: [[INI_HUT - 2.7, 1.6, 4.8], [INI_HUT - 0.9, 1.25, -2]] },
    actors: [
      { key: 'ini', x: INI_HUT - 0.3, z: -1.0, flip: true },
      { key: 'player', x: INI_HUT - 1.9, z: 0.4 },
    ],
  },
  // night fire: the elder's tale, Ini across the flames
  fire: {
    minute: H(21, 30), ms: 9000, tint: 0xffc898,
    cam: { from: [[FIRE + 0.2, 1.5, 4.6], [FIRE, 0.95, -0.6]], to: [[FIRE - 0.1, 1.4, 4.0], [FIRE, 0.95, -0.6]] },
    actors: [
      { key: 'elder', x: FIRE - 0.75, z: -0.9 },
      { key: 'ini', x: FIRE + 0.8, z: -0.9, flip: true },
      { key: 'player', x: FIRE - 0.4, z: 0.9 },
    ],
  },
  // the festival opens: drummers, crowd, maidens dancing
  festival: {
    minute: H(13), ms: 10000,
    cam: { from: [[SQUARE - 1.2, 1.8, 6.5], [SQUARE - 0.4, 1.1, -1]], to: [[SQUARE, 1.7, 5.6], [SQUARE - 0.4, 1.1, -1]] },
    actors: [
      { key: 'crowd_560', x: SQUARE - 0.6, z: -3.2, h: 1.7 },
      { key: 'drummer', x: SQUARE - 2.4, z: -1.8, dance: 0.4 },
      { key: 'drummer', x: SQUARE - 1.9, z: -1.8, dance: 1.1 },
      { key: 'drummer', x: SQUARE - 1.4, z: -1.8, dance: 1.9 },
      { key: 'rival_affiong', x: SQUARE - 0.6, z: -0.7, dance: 0.2 },
      { key: 'rival_nkoyo', x: SQUARE + 0.1, z: -0.7, dance: 1.4 },
      { key: 'ini', x: SQUARE + 0.8, z: -0.5, dance: 2.2, flip: true },
      { key: 'rival_ekaette', x: SQUARE + 1.5, z: -0.7, dance: 3.0, flip: true },
    ],
  },
  // the two of them on the jetty under the moon
  jetty: {
    minute: H(22), ms: 10000, moon: [JETTY + 2, 6.5, -28],
    cam: { from: [[JETTY + 0.3, 1.0, 4.2], [JETTY + 0.6, 1.6, -10]], to: [[JETTY + 0.1, 1.1, 3.6], [JETTY + 0.5, 1.8, -10]] },
    actors: [
      { key: 'player', x: JETTY + 0.1, y: DECK, z: 0.5 },
      { key: 'ini', x: JETTY + 0.6, y: DECK, z: 0.5, flip: true },
    ],
  },
};

/** The climb: the camera rides beside the climber, up the trunk of palm i. */
export function climbCamera(palmX, z, y, progress) {
  return {
    pos: [palmX + 0.1, y + 1.25 + progress * 0.4, z + 3.8], // from the front, so neighbouring palms stay to the sides
    look: [palmX, y + 1.1 + progress * 0.9, z],
  };
}
