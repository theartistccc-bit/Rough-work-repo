import Phaser from 'phaser';

// Shared pieces for the minigame scenes: the stage area, small particle textures, backdrops.
import { baked } from '../ui.js';
import { P } from '../art/palette.js';

/** The painted stage inside the minigame panel. */
export const STAGE = { x: 170, y: 118, w: 620, h: 274 };

/** Tiny textures for particles: a soft dot, a water drop, a leaf. Made once. */
export function ensureFx(scene) {
  const make = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  make('fx_dot', 16, 16, (g) => { g.fillStyle(0xffffff, 0.35); g.fillCircle(8, 8, 8); g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 4); });
  make('fx_drop', 8, 12, (g) => { g.fillStyle(0xd8f0ea, 1); g.fillEllipse(4, 7, 6, 9); });
  make('fx_leaf', 14, 6, (g) => { g.fillStyle(P.palmLight, 1); g.fillEllipse(7, 3, 14, 5); });
  make('fx_dust', 16, 16, (g) => { g.fillStyle(0xd9b27a, 0.5); g.fillCircle(8, 8, 8); });
}

/** A row of crowd silhouettes, baked once. */
export function ensureCrowd(scene, w = 620) {
  const key = `crowd_${w}`;
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ add: false });
    for (let i = 0; i < w / 24; i++) {
      const x = i * 24 + (i % 2) * 8;
      const y = 30 + (i % 3) * 8;
      g.fillStyle(0x1a120c, 1).fillEllipse(x, y + 40, 26, 60).fillCircle(x, y, 10);
    }
    g.generateTexture(key, w, 90);
    g.destroy();
  }
  return key;
}

/** A one-shot burst emitter; call .explode(n, x, y). */
export function burst(scene, key, cfg) {
  return scene.add.particles(0, 0, key, { emitting: false, ...cfg });
}

/** Clip children to the stage so scrolling scenery stays inside the panel. */
export function stageMask(scene) {
  const shape = scene.make.graphics({ add: false });
  shape.fillStyle(0xffffff).fillRoundedRect(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 10);
  return shape.createGeometryMask();
}

/** A warm sky with a horizon line, baked once per variant. */
export function skyPanel(scene, key, night) {
  const { w, h } = STAGE;
  return baked(scene, key, w, h, (g) => {
    const top = night ? 0x141c3a : 0xe9a85a;
    const low = night ? 0x2a3560 : 0xf6dca8;
    for (let i = 0; i < 24; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(top), Phaser.Display.Color.ValueToColor(low), 23, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (h * i) / 24, w, h / 24 + 1);
    }
    if (night) {
      g.fillStyle(0xfff4d6, 0.8);
      for (let i = 0; i < 40; i++) g.fillCircle((i * 157) % w, (i * 71) % (h * 0.5), (i % 3) * 0.5 + 0.6);
    }
  }).setPosition(STAGE.x, STAGE.y);
}
