import Phaser from 'phaser';
import { clearSave, loadSave, newGame, store } from '../store.js';
import { place } from '../art/textures.js';
import { button, text } from '../ui.js';

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(960, 540);
    this.add.rectangle(0, 0, 960, 540, 0x0d1430, 0.45).setOrigin(0);
    place(this, 'moon', 770, 120, 0.5);
    place(this, 'bg_far', 480, 420).setAlpha(0.9);
    this.add.rectangle(0, 420, 960, 120, 0x3d6b66).setOrigin(0);
    place(this, 'palm', 130, 440);
    place(this, 'hut', 820, 450);
    place(this, 'canoe', 470, 448);
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
