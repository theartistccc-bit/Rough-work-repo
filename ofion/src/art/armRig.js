// Builds the body-without-arms and the two arm pictures from the player picture, as textures.
import { armSide, findArmCuts } from './arms.js';

/**
 * Returns { w, h, cuts, pivots: { left:[x,y], right:[x,y] }, armLen } in picture pixels,
 * and adds the textures 'rig_body', 'rig_armL', 'rig_armR'. Made once.
 */
export function makeArmRig(scene) {
  if (scene.registry.get('armRig')) return scene.registry.get('armRig');
  const src = scene.textures.get('player').getSourceImage();
  const w = src.width;
  const h = src.height;
  const base = document.createElement('canvas');
  base.width = w; base.height = h;
  const bctx = base.getContext('2d', { willReadFrequently: true });
  bctx.drawImage(src, 0, 0);
  const data = bctx.getImageData(0, 0, w, h);
  const solid = (x, y) => data.data[(y * w + x) * 4 + 3] > 40;
  const cuts = findArmCuts(solid, w, h);
  const pieces = { body: bctx.createImageData(w, h), left: bctx.createImageData(w, h), right: bctx.createImageData(w, h) };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const to = pieces[armSide(x, y, cuts) ?? 'body'].data;
      for (let k = 0; k < 4; k++) to[i + k] = data.data[i + k];
    }
  }
  for (const [name, img] of [['rig_body', pieces.body], ['rig_armL', pieces.left], ['rig_armR', pieces.right]]) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(img, 0, 0);
    if (scene.textures.exists(name)) scene.textures.remove(name);
    scene.textures.addCanvas(name, c);
  }
  // each arm turns from the top of its own cut piece: the shoulder if the whole arm stands apart,
  // the elbow if the upper arm lies against the chest (so the forearm never floats free)
  const shoulderY = cuts.top + Math.round(h * 0.035);
  const firstRow = (piece) => {
    for (let y = cuts.top; y <= cuts.bottom; y++) for (let x = 0; x < w; x++) if (piece.data[(y * w + x) * 4 + 3] > 40) return y;
    return shoulderY;
  };
  const pivotY = (piece) => Math.max(shoulderY, firstRow(piece) + 2);
  const ly = pivotY(pieces.left);
  const ry = pivotY(pieces.right);
  const rig = {
    w, h, cuts,
    pivots: { left: [cuts.left - 1, ly], right: [cuts.right + 1, ry] },
    armLen: { left: cuts.bottom - ly, right: cuts.bottom - ry },
  };
  scene.registry.set('armRig', rig);
  return rig;
}

/**
 * Stage actors for the body and both arms, all the same size so each arm turns about its shoulder.
 * opts: { x, y, z, h, cropTop, flip }. Returns { defs, place(sprites, x, y, z), hand(side, deg, ...) }.
 */
export function armActors(rig, { x, y = 0, z, h = 1.75, cropTop = 1, flip = false }) {
  const shownH = rig.h * cropTop;
  const s = h / shownH; // world units per picture pixel
  const piece = (key, pivot, dz) => {
    const cx = pivot ? pivot[0] / rig.w : 0.5;
    const cy = pivot ? 1 - pivot[1] / shownH : 0;
    return { key, x, y, z: z + dz, h, cropTop, flip, cx: flip ? 1 - cx : cx, cy };
  };
  const defs = [
    piece('rig_armL', rig.pivots.left, -0.004),
    piece('rig_body', null, 0),
    piece('rig_armR', rig.pivots.right, 0.004),
  ];
  const off = (pivot) => [(flip ? -1 : 1) * (pivot[0] - rig.w / 2) * s, (shownH - pivot[1]) * s];
  const offL = off(rig.pivots.left);
  const offR = off(rig.pivots.right);
  return {
    defs,
    s,
    /** Move the three pieces together; arm angles in radians (screen rotation). */
    place([armL, body, armR], px, py, pz, angL = 0, angR = 0, bodyRot = 0) {
      body.position.set(px, py, pz);
      body.material.rotation = bodyRot;
      armL.position.set(px + offL[0], py + offL[1], pz - 0.004);
      armR.position.set(px + offR[0], py + offR[1], pz + 0.004);
      armL.material.rotation = angL;
      armR.material.rotation = angR;
    },
    /** World position of a hand given its shoulder and screen rotation. */
    hand(side, px, py, ang) {
      const o = side === 'left' ? offL : offR;
      const len = rig.armLen[side] * s * 0.92;
      return [px + o[0] + Math.sin(ang) * len, py + o[1] - Math.cos(ang) * len];
    },
  };
}
