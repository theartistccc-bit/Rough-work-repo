// How a palm-wine tapper climbs: a belt loops round the trunk and his lower back, he leans back into it
// with his feet braced on the trunk, and "walks" up: hitch the belt higher, step the feet up, repeat.

export const BELT = {
  low: 0.9, // belt height above the feet after a step (around the lower back)
  high: 1.3, // after hitching it up the trunk
  leanLow: 30, // degrees leaning back from the trunk, belt low
  leanHigh: 15, // belt hitched high: he comes in closer to the trunk
};

export const createBeltClimb = () => ({ moves: 0, feet: 0, feetTarget: 0, belt: BELT.low, beltTarget: BELT.low });

/**
 * A good grip: odd moves hitch the belt up, even moves step the feet up to the new height.
 * climbed: how high the climb has reached (world units). Slips drop the belt back.
 */
export function beltMove(s, climbed, slipped) {
  if (slipped) {
    s.beltTarget = BELT.low;
    s.moves -= s.moves % 2; // the hitch is lost
    return s;
  }
  s.moves += 1;
  if (s.moves % 2 === 1) s.beltTarget = BELT.high;
  else { s.feetTarget = climbed; s.beltTarget = BELT.low; }
  return s;
}

/** Ease toward the targets; feet move in quick steps, the belt slides. */
export function stepBelt(s, dtMs) {
  s.feet += (s.feetTarget - s.feet) * Math.min(1, dtMs / 140);
  s.belt += (s.beltTarget - s.belt) * Math.min(1, dtMs / 110);
  return s;
}

/** Lean back from the trunk for a belt height (degrees). */
export function beltLean(belt) {
  const t = Math.min(1, Math.max(0, (belt - BELT.low) / (BELT.high - BELT.low)));
  return BELT.leanLow + (BELT.leanHigh - BELT.leanLow) * t;
}
