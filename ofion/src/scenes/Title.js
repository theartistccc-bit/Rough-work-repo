import Phaser from 'phaser';
import { clearSave, loadSave, newGame, store } from '../store.js';
import { place } from '../art/textures.js';
import { button, text } from '../ui.js';
import { SHOTS_3D } from '../world3d/shots.js';

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  show3D() {
    if (!this.sys.isActive() || this.started3d) return;
    let w3d = null;
    try { if (store.World3D && !/[?&]2d/.test(location.search)) w3d = store.w3d ??= new store.World3D(); } catch { w3d = null; }
    if (!w3d) return this.draw2D();
    this.started3d = true;
    this.w3d = w3d;
    w3d.show(true);
    w3d.stage(this.textures, SHOTS_3D.title);
    this.shotT0 = this.time.now;
    this.tweens.add({ targets: this.bg, alpha: 0, duration: 900 });
    this.shade.setAlpha(0.28); // keeps the title readable over the moving scene
  }

  /** The old painted title, for devices where 3D can't start. */
  draw2D() {
    this.bg.setAlpha(0);
    const back = [
      this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(960, 540),
      this.add.rectangle(0, 0, 960, 540, 0x0d1430, 0.45).setOrigin(0),
      place(this, 'moon', 770, 120, 0.5),
      place(this, 'bg_far', 480, 420).setAlpha(0.9),
      this.add.rectangle(0, 420, 960, 120, 0x3d6b66).setOrigin(0),
      place(this, 'palm', 130, 440),
      place(this, 'hut', 820, 450),
      place(this, 'canoe', 470, 448),
    ];
    back.forEach((o, i) => o.setDepth(-10 + i * 0.01));
  }

  update(time) {
    if (!this.w3d) return;
    // a slow drift across the creek and village; start again when it ends
    if (time - this.shotT0 > SHOTS_3D.title.ms) { this.w3d.stage(this.textures, SHOTS_3D.title); this.shotT0 = time; }
    this.w3d.update(0, SHOTS_3D.title.minute, time);
  }

  create() {
    // the 3D village fades in behind the title once its engine has loaded; until then, a plain ground
    this.bg = this.add.rectangle(0, 0, 960, 540, 0x2a1a10).setOrigin(0);
    this.shade = this.add.rectangle(0, 0, 960, 540, 0x1a0f08, 0).setOrigin(0);
    store.world3dReady.then(() => this.show3D());
    text(this, 480, 120, 'Ọfiọñ', 86, '#f2e6cc', { stroke: '#3a2414', strokeThickness: 8 }).setOrigin(0.5);
    text(this, 480, 190, 'A life on the Calabar creeks', 22, '#f0c070', { stroke: '#3a2414', strokeThickness: 4 }).setOrigin(0.5);

    const saved = loadSave();
    const start = async (g) => {
      if (this.starting) return;
      this.starting = true;
      store.g = g;
      this.input.keyboard.off('keydown');
      // wait (briefly) for the 3D village to finish loading; fall back to 2D if it is slow
      await Promise.race([store.world3dReady, new Promise((r) => setTimeout(r, 6000))]);
      this.scene.start('Village');
    };
    const y = 260;
    button(this, 360, y, 240, 50, 'Begin a new life', () => { clearSave(); start(newGame()); }, { size: 20 });
    if (saved) button(this, 360, y + 62, 240, 50, `Continue (day ${saved.clock.day})`, () => start(saved), { size: 20 });
    text(this, 480, 505, 'Keys: A/D or ◀ ▶ walk · E / Space act · Q satchel · 1-9 choose', 15, '#f2e6cc').setOrigin(0.5);
    this.input.keyboard.on('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') start(saved ?? newGame());
    });
  }
}
