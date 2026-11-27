import Phaser from 'phaser';
import { BARTER } from '../logic/config.js';
import { place, strip } from '../art/textures.js';
import { text } from '../ui.js';

// The upriver market: a landing with two traders, reached by canoe.
// Trading uses the same barter dialogs as the village; the Village scene drives them.
// data: { onTrade(id, back), onLeave() }
export const UPRIVER_TRADERS = Object.keys(BARTER.traders).filter((id) => BARTER.traders[id].place === 'upriver');

export default class Upriver extends Phaser.Scene {
  constructor() { super('Upriver'); }

  init(data) { this.data_ = data; }

  create() {
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(960, 540);
    strip(this, 'bg_far', 0, 160, 960).setTint(0xd8e0c0);
    const water = strip(this, 'water', 0, 400, 960);
    water.setDisplaySize(960, 140);
    this.water = water;
    this.add.rectangle(0, 390, 960, 30, 0xa8784a).setOrigin(0);
    place(this, 'jetty', 140, 470).setScale(1.4);
    place(this, 'canoe', 150, 430);
    place(this, 'hut', 860, 400).setScale(0.9).setTint(0xe8d8c0);
    place(this, 'palm', 30, 400).setScale(0.9);
    UPRIVER_TRADERS.forEach((id, i) => {
      const x = 420 + i * 230;
      place(this, i ? 'stall_farmer' : 'stall_adorner', x, 400).setTint(0xf0e0d0);
      place(this, `trader_${id}`, x + 10, 396);
    });
    text(this, 480, 40, 'The upriver market', 30, '#f2e6cc', { stroke: '#3a2414', strokeThickness: 6 }).setOrigin(0.5);
    this.time.delayedCall(200, () => this.menu());
  }

  update(time, dt) {
    this.water.tilePositionX += dt * 0.01;
  }

  menu() {
    const hud = this.scene.get('Hud');
    hud.showDialog({
      title: 'The upriver landing',
      body: 'Inland people trade here. They want creek food (fish, periwinkles, palm oil) and part with beads, camwood and thread more cheaply than Eka Nse at home.',
      options: [
        ...UPRIVER_TRADERS.map((id) => ({
          label: `${BARTER.traders[id].name} (${BARTER.traders[id].trade})`,
          onPick: () => this.data_.onTrade(id, () => this.menu()),
        })),
        { label: 'Paddle home', onPick: () => this.data_.onLeave() },
      ],
      onBack: () => this.menu(),
    });
  }
}
