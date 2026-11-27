import { createFishing, pullFishing, stepFishing } from '../logic/minigames.js';
import { makeRng } from '../logic/rng.js';
import MiniBase from './MiniBase.js';
import { text } from '../ui.js';
import { P } from '../art/palette.js';
import { sfx } from '../audio.js';

export default class Fishing extends MiniBase {
  constructor() { super('Fishing'); }

  create() {
    this.frame('Fishing from the jetty', 'Wait for the float to dip, then pull: ● / E');
    const water = this.add.graphics();
    water.fillStyle(this.data_.night ? 0x1d3440 : P.water, 1);
    water.fillRoundedRect(190, 130, 580, 250, 10);
    water.lineStyle(2, P.waterLight, 0.5);
    for (let i = 0; i < 14; i++) water.lineBetween(220 + (i * 97) % 520, 160 + (i * 53) % 200, 260 + (i * 97) % 520, 160 + (i * 53) % 200);
    this.line = this.add.graphics();
    this.float = this.add.circle(480, 250, 9, P.red).setStrokeStyle(3, P.cream);
    this.mark = text(this, 480, 200, '!', 40, '#ffe08a').setOrigin(0.5).setVisible(false);
    this.rng = makeRng(this.data_.seed);
    this.f = createFishing(this.rng, { dawnOrDusk: this.data_.dawnOrDusk });
    this.caught = 0;
    this.t = 0;
  }

  update(time, dt) {
    if (this.finished) return;
    this.t += dt;
    const before = this.f.state;
    const st = stepFishing(this.f, dt);
    if (st === 'biting' && before !== 'biting') sfx('bite');
    const bob = st === 'biting' ? 10 + Math.sin(this.t / 40) * 5 : Math.sin(this.t / 400) * 3;
    this.float.y = 250 + bob;
    this.mark.setVisible(st === 'biting');
    this.line.clear().lineStyle(2, 0xf2e6cc, 0.7).lineBetween(480, 60, 480, this.float.y - 8);
    if (st === 'escaped') { sfx('splash'); this.result('It slipped away…'); }
  }

  press(name) {
    if (name === 'back') return this.finish({ caught: this.caught }, 'You wind in your line.', 500);
    if (name !== 'act') return;
    const st = pullFishing(this.f);
    if (st === 'caught') {
      this.caught += 1;
      sfx('catch');
      this.result('A fish! ● to cast again, ✕ / Q to stop.');
    } else if (st === 'early') sfx('splash'), this.result('Too early: the fish is scared off.');
    else if (st === 'escaped' || st === 'caught-done') this.recast();
  }

  result(line) {
    this.hint.setText(line.includes('cast again') ? line : `${line}  ● to cast again, ✕ / Q to stop.`);
    this.f.state = 'caught-done';
    this.mark.setVisible(false);
  }

  recast() {
    if (this.caught >= 3) return this.finish({ caught: this.caught }, 'Enough for today. Your basket is full.');
    this.f = createFishing(this.rng, { dawnOrDusk: this.data_.dawnOrDusk });
    this.hint.setText('Wait for the float to dip, then pull: ● / E');
  }
}
