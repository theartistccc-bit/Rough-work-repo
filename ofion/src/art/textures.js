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

/** Frame counts of the optional action strips (null: work it out from the picture's shape). */
export const STRIPS = {};

/** How many frames an action strip has: from its name, or from its shape (frameAspect = width/height of one frame). */
export function stripFrames(scene, key, frameAspect) {
  if (!scene.textures.exists(key)) return 0;
  if (STRIPS[key]) return STRIPS[key];
  const src = scene.textures.get(key).getSourceImage();
  return Math.max(1, Math.round(src.width / (src.height * frameAspect)));
}
export const realArt = (key) => Boolean(urls[key]);

export function queueArt(scene) {
  for (const key of ALL_KEYS) if (urls[key]) scene.load.image(key, urls[key]);
  if (urls.player_walk) scene.load.image('player_walk', urls.player_walk);
  // optional action strips: player_climb.png / player_paddle.png, or with the frame count in the
  // name (player_paddle_6.png). Frames sit side by side in one row.
  for (const [name, url] of Object.entries(urls)) {
    const m = name.match(/^(player_(?:climb|paddle))(?:_(\d+))?$/);
    if (m) { scene.load.image(m[1], url); STRIPS[m[1]] = m[2] ? Number(m[2]) : null; }
  }
  for (const key of Object.keys(urls)) if (key.startsWith('cut_')) scene.load.image(key, urls[key]); // cutscene paintings
}

/**
 * An optional walk cycle: ./assets/player_walk.png, frames side by side in one row,
 * each frame the same shape as the player sprite (44:92). The frame count is worked out
 * from the picture's width, so any number of frames works.
 */
export function makeWalk(scene) {
  if (!scene.textures.exists('player_walk')) return false;
  const tex = scene.textures.get('player_walk');
  const src = tex.getSourceImage();
  const fw = Math.round((src.height * SPRITES.player.w) / SPRITES.player.h);
  const n = Math.max(1, Math.round(src.width / fw));
  for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, src.height);
  scene.anims.create({ key: 'walk', frames: Array.from({ length: n }, (_, i) => ({ key: 'player_walk', frame: i })), frameRate: 10, repeat: -1 });
  return true;
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
