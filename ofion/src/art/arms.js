// Arms cut from the still player picture, so they can swing from the shoulders
// (reaching up a palm, pulling a paddle). The body keeps everything else.

/**
 * Find where to cut each arm from the body.
 * Looks for rows where an arm stands apart from the torso and takes the gap as the cut line.
 * @param {(x:number,y:number)=>boolean} solid
 * @returns {{ left:number, right:number, top:number, bottom:number }} cut columns and the arm rows
 */
export function findArmCuts(solid, w, h) {
  const top = Math.round(h * 0.24);
  const bottom = Math.round(h * 0.57);
  const lefts = [];
  const rights = [];
  for (let y = top; y <= bottom; y++) {
    const segs = [];
    let s = -1;
    for (let x = 0; x <= w; x++) {
      const on = x < w && solid(x, y);
      if (on && s < 0) s = x;
      if (!on && s >= 0) { if (x - s >= 2) segs.push([s, x - 1]); s = -1; }
    }
    if (segs.length < 2) continue;
    const first = segs[0];
    const last = segs[segs.length - 1];
    // a narrow run at the edge, apart from the rest, is an arm
    if (first[1] - first[0] < w * 0.2) lefts.push((first[1] + segs[1][0]) / 2);
    if (last[1] - last[0] < w * 0.2) rights.push((segs[segs.length - 2][1] + last[0]) / 2);
  }
  const median = (a, fallback) => {
    if (!a.length) return fallback;
    const s = [...a].sort((p, q) => p - q);
    return Math.round(s[Math.floor(s.length / 2)]);
  };
  return { left: median(lefts, Math.round(w * 0.3)), right: median(rights, Math.round(w * 0.7)), top, bottom };
}

/** Is this pixel part of the left or right arm piece? */
export function armSide(x, y, cuts) {
  if (y < cuts.top || y > cuts.bottom) return null;
  if (x < cuts.left) return 'left';
  if (x > cuts.right) return 'right';
  return null;
}

/**
 * Arm angles (degrees, positive = toward the front) through one climbing grip.
 * t: 0..1 through the grip; side: which hand reaches this time (-1 left, 1 right).
 * Both hands stay high on the trunk; the reaching one stretches up, the other pulls down.
 */
export function climbArms(t, side) {
  const reach = 172;
  const pull = 132;
  const e = t * t * (3 - 2 * t);
  const up = pull + (reach - pull) * e;
  const down = reach - (reach - pull) * e;
  return side < 0 ? { left: up, right: down } : { left: down, right: up };
}

/**
 * Arm angles through one paddle stroke, t 0..1: reach forward, pull back past the hip, recover.
 * The top hand rides higher on the shaft than the bottom hand.
 */
export function paddleArms(t) {
  const swing = t < 0.65 ? 55 - (t / 0.65) * 85 : -30 + ((t - 0.65) / 0.35) * 85; // forward 55° .. back -30°
  return { top: swing + 35, bottom: swing };
}
