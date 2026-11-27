// A walking rig cut from one still picture: the body stays whole, the two lower legs are cut out
// and swung in a proper stride. Works with the painted placeholder or with real art.

/**
 * Find where the legs start and the gap between them, from an opacity mask.
 * @param {(x:number,y:number)=>boolean} solid  is the pixel at x,y part of the figure
 * @returns {{ legTop:number, split:number }|null}  null if two separate legs can't be found
 */
export function findLegs(solid, w, h) {
  const segments = (y) => {
    const out = [];
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const on = x < w && solid(x, y);
      if (on && start < 0) start = x;
      if (!on && start >= 0) { if (x - start >= Math.max(2, w * 0.03)) out.push([start, x - 1]); start = -1; }
    }
    return out;
  };
  // walk up from just above the feet while the row still shows two legs
  const probe = Math.round(h * 0.9);
  const two = segments(probe);
  if (two.length < 2) return null;
  // the gap between the two widest runs
  const [a, b] = [...two].sort((p, q) => (q[1] - q[0]) - (p[1] - p[0])).slice(0, 2).sort((p, q) => p[0] - q[0]);
  const split = Math.round((a[1] + b[0]) / 2);
  let legTop = probe;
  for (let y = probe; y > h * 0.5; y--) {
    if (segments(y).length >= 2 && !solid(split, y)) legTop = y;
    else break;
  }
  // stop the cut a little above where the legs separate, so the knees stay joined to the body
  legTop = Math.max(Math.round(h * 0.55), legTop - Math.round(h * 0.03));
  if (h - legTop < h * 0.12) return null; // legs too short to swing
  return { legTop, split };
}

/**
 * The pose at a point in the stride. phase runs 0..2π per full stride (two steps).
 * Legs swing opposite each other; the body is highest when a leg passes under it.
 */
export function gaitPose(phase, amount = 1) {
  const s = Math.sin(phase);
  return {
    front: 24 * s * amount, // degrees, leg rotation about the knee
    back: -24 * s * amount,
    bob: -3.2 * Math.abs(Math.cos(phase)) * amount, // px, up at mid-stance
    sway: 1.6 * s * amount, // degrees, a little torso counter-rotation
    lean: 3 * amount, // degrees forward while walking
  };
}

/** Stride length in px: how far one full stride (two steps) carries the walker. */
export const STRIDE_PX = 46;
