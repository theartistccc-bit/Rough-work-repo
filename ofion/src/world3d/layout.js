// Pure maths for the 3D village: where things sit, how the camera follows, how the sky looks.
// Kept free of three.js so it is tested like the game rules.
import { GROUND_Y } from '../world.js';

/** Village x in pixels -> world x in metres-ish units. The 2D layout is kept, just in depth. */
export const toWorldX = (px) => px / 100;

/** People are drawn this many units per picture pixel: a 92px villager stands about 1.75 tall. */
export const PERSON_SCALE = 0.019;

/** World height of a 2D picture's y (feet on GROUND_Y stand on the ground at 0). */
export const toWorldY = (py) => (GROUND_Y - py) * PERSON_SCALE;

/** Depth lanes: negative z is further from the camera. */
export const LANES = {
  player: 0.6,
  path: 0,
  ini: 0.1,
  elder: -0.5,
  judges: -0.6,
  wrestlers: -0.9,
  rivals: -0.9,
  traders: -0.8,
  drummers: -1.7,
  crowd: -3,
  stalls: -1.7,
  huts: -5.2,
  palms: -3.2,
  tree: -3.4,
};

/** The camera rides above and in front of the player, a raised three-quarter view. */
export function cameraFor(playerPx) {
  const x = toWorldX(playerPx);
  return { pos: [x, 2.5, 10.5], look: [x, 1.9, -3] };
}

const lerp = (a, b, t) => a + (b - a) * t;
export function mixHex(a, b, t) {
  const ch = (h, s) => (h >> s) & 255;
  const m = (s) => Math.round(lerp(ch(a, s), ch(b, s), t));
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/**
 * Sky and light for a light level (0 night .. 1 day). Dawn and dusk add a warm glow.
 * @returns {{ sky:number, sunIntensity:number, hemiIntensity:number, sunColor:number, night:number }}
 */
export function skyAt(light) {
  const warm = light > 0 && light < 1 ? 1 - Math.abs(light - 0.5) * 2 : 0;
  const base = mixHex(0x141c3a, 0xf2cf96, light);
  return {
    sky: mixHex(base, 0xe8885a, warm * 0.55),
    sunIntensity: 1.5 * light,
    hemiIntensity: 0.45 + 1.05 * light,
    sunColor: mixHex(0xfff2dc, 0xff9a5a, warm),
    night: 1 - light,
  };
}

/** The sun's angle across the sky: rises in the east (left) at 06:00, sets at 18:30. */
export function sunPosition(minute, centreX) {
  const t = (minute - 6 * 60) / (12.5 * 60); // 0 at sunrise, 1 at sunset
  const a = Math.PI * Math.min(1, Math.max(0, t));
  return [centreX - Math.cos(a) * 30, Math.sin(a) * 22 + 2, 8];
}
