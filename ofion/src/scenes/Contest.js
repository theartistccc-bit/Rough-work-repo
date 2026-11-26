import { CONTEST } from '../logic/config.js';
import MiniBase from './MiniBase.js';
import { text } from '../ui.js';

// Reveal the four entries and their scores, then the winner.
export default class Contest extends MiniBase {
  constructor() { super('Contest'); }

  create() {
    this.frame('The festival hairstyle contest', 'The judges confer…');
    const { ranked, styleId } = this.data_;
    // show the entries in a fixed order (rivals then Ini) so ranking is a reveal
    const order = [...ranked].sort((a, b) => (a.player ? 1 : 0) - (b.player ? 1 : 0) || a.name.localeCompare(b.name));
    const rivalStyles = ['ridges', 'crest', 'crown'];
    order.forEach((e, i) => {
      const x = 240 + i * 160;
      const bust = e.player ? styleId : rivalStyles[CONTEST.rivals.findIndex((r) => r.name === e.name) % 3];
      this.add.image(x, 200, `bust_${bust}`).setDisplaySize(110, 134).setTint(e.player ? 0xffffff : 0xf0e0d0);
      text(this, x, 275, e.name, 18, e.player ? '#f0c070' : '#f2e6cc').setOrigin(0.5);
      text(this, x, 296, `by ${e.styler}`, 13, '#c8b090').setOrigin(0.5);
      const s = text(this, x, 330, '', 14, '#f2e6cc', { align: 'center', lineSpacing: 2 }).setOrigin(0.5, 0);
      this.time.delayedCall(500 + i * 500, () => s.setText(
        `craft ${e.craft}  adorn ${e.adornment}\nspirit ${e.spirit}\n${e.total} / 100`));
      e._x = x;
    });
    this.time.delayedCall(500 + order.length * 500 + 400, () => {
      const win = ranked[0];
      const w = order.find((e) => e.name === win.name);
      this.add.star(w._x, 120, 5, 10, 22, 0xf0c070);
      const place = ranked.findIndex((e) => e.player) + 1;
      this.hint.setText(`${win.name} wins! Ini places ${['', '1st', '2nd', '3rd', '4th'][place]}.  ● to continue`);
      this.ready = true;
    });
  }

  press(name) {
    if (this.ready && (name === 'act' || name === 'back')) this.finish({}, null, 0);
  }
}
