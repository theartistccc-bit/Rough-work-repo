// Small shared UI helpers.
export const FONT = 'Georgia, "Times New Roman", serif';
export const INK = '#2a1a10';
export const CREAM = '#f2e6cc';

export function text(scene, x, y, str, size = 18, color = CREAM, extra = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: `${size}px`, color, resolution: 1.5, ...extra,
  });
}

/**
 * Draw once into a cached texture and show it as an image.
 * Live Graphics objects are rebuilt every frame in WebGL, which is costly on cheap phones.
 */
export function baked(scene, key, w, h, draw) {
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({ add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }
  return scene.add.image(0, 0, key).setOrigin(0);
}

/** A rounded panel in painted-wood colours. */
export function panel(scene, x, y, w, h, alpha = 0.94) {
  const key = `panel_${w}x${h}_${alpha}`;
  return baked(scene, key, w + 6, h + 8, (g) => {
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(4, 6, w, h, 14);
    g.fillStyle(0x3a2414, alpha);
    g.fillRoundedRect(0, 0, w, h, 14);
    g.lineStyle(3, 0xc8873a, 0.9);
    g.strokeRoundedRect(4, 4, w - 8, h - 8, 11);
  }).setPosition(x, y);
}

/** A rounded pill of one colour, cached by size. */
export function pill(scene, w, h, color, alpha, r = h / 2) {
  w = Math.ceil(w);
  return baked(scene, `pill_${w}x${h}_${color}_${alpha}`, w, h, (g) => {
    g.fillStyle(color, alpha);
    g.fillRoundedRect(0, 0, w, h, r);
  });
}

/** A tappable button. Its three looks are drawn once into cached textures. */
export function button(scene, x, y, w, h, label, onTap, { size = 18, disabled = false } = {}) {
  const c = scene.add.container(x, y);
  const look = (fill, edge) => baked(scene, `btn_${w}x${h}_${fill}_${edge}`, w, h, (g) => {
    g.fillStyle(fill, 1);
    g.fillRoundedRect(0, 0, w, h, 10);
    g.lineStyle(2, 0xf2e6cc, edge);
    g.strokeRoundedRect(1, 1, w - 2, h - 2, 10);
  }).destroy();
  look(0x8a4f22, 0.5); look(0xb06a2c, 0.5); look(0x4a3a2c, 0.2);
  const bg = scene.add.image(0, 0, disabled ? `btn_${w}x${h}_${0x4a3a2c}_0.2` : `btn_${w}x${h}_${0x8a4f22}_0.5`).setOrigin(0);
  const draw = (hover) => {
    if (!disabled) bg.setTexture(`btn_${w}x${h}_${hover ? 0xb06a2c : 0x8a4f22}_0.5`);
  };
  const t = text(scene, w / 2, h / 2, label, size, disabled ? '#9a8a78' : CREAM).setOrigin(0.5);
  c.add([bg, t]);
  c.setSize(w, h);
  if (!disabled) {
    const zone = scene.add.zone(0, 0, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => draw(true));
    zone.on('pointerout', () => draw(false));
    zone.on('pointerup', (p, lx, ly, e) => { e?.stopPropagation?.(); onTap(); });
    c.add(zone);
  }
  c.setHighlight = draw;
  return c;
}
