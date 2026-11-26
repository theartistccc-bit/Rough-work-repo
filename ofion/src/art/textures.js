// Load real art from ./assets when present, otherwise paint placeholders.
import { SPRITES } from './placeholders.js';

// Vite lists the files in ./assets at build time, so a new picture needs no code change
// and missing pictures cost no failed network requests.
const FILES = import.meta.glob('../../assets/*.{png,webp,jpg,jpeg}', {
  eager: true, query: '?url', import: 'default',
});

const urls = {};
for (const [path, url] of Object.entries(FILES)) {
  const name = path.split('/').pop().replace(/\.[^.]+$/, '');
  urls[name] = url;
}

export const ALL_KEYS = ['sky', ...Object.keys(SPRITES)];
export const realArt = (key) => Boolean(urls[key]);

export function queueArt(scene) {
  for (const key of ALL_KEYS) if (urls[key]) scene.load.image(key, urls[key]);
}

export function paintMissing(scene) {
  if (!scene.textures.exists('sky')) paintSky(scene);
  for (const [key, s] of Object.entries(SPRITES)) {
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({ add: false });
    s.paint(g, s.w, s.h);
    g.generateTexture(key, s.w, s.h);
    g.destroy();
  }
}

function paintSky(scene) {
  const tex = scene.textures.createCanvas('sky', 960, 540);
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, 540);
  grad.addColorStop(0, '#e9a85a');
  grad.addColorStop(0.45, '#f3cf8e');
  grad.addColorStop(1, '#f6e2b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 540);
  // loose brushed clouds
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#fff4dc';
  for (const [x, y, w] of [[140, 90, 220], [520, 60, 300], [800, 130, 180], [330, 170, 160]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  tex.refresh();
}

/** An image at its manifest size, standing on its bottom-centre. */
export function place(scene, key, x, y, originY = 1) {
  const s = SPRITES[key] ?? { w: 960, h: 540 };
  return scene.add.image(x, y, key).setOrigin(0.5, originY).setDisplaySize(s.w, s.h);
}

/** A horizontally tiling strip, scaled so real art matches the placeholder height. */
export function strip(scene, key, x, y, width) {
  const s = SPRITES[key];
  const src = scene.textures.get(key).getSourceImage();
  const k = s.h / src.height;
  const t = scene.add.tileSprite(x, y, width, s.h, key).setOrigin(0, 0);
  t.setTileScale(k, k);
  return t;
}
