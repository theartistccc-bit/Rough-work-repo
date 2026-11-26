import Phaser from 'phaser';
import { panel, text } from '../ui.js';

// Shared frame for minigames: a painted panel, a title and the press events.
export default class MiniBase extends Phaser.Scene {
  init(data) {
    this.data_ = data;
    this.finished = false;
  }

  frame(title, hint) {
    this.add.rectangle(0, 0, 960, 540, 0x000000, 0.45).setOrigin(0);
    panel(this, 150, 60, 660, 380);
    this.title = text(this, 480, 80, title, 26, '#f0c070').setOrigin(0.5, 0);
    this.hint = text(this, 480, 410, hint, 16, '#e0c89a').setOrigin(0.5);
    this.onPress = (name) => !this.finished && this.press(name);
    this.game.events.on('press', this.onPress);
    this.events.once('shutdown', () => this.game.events.off('press', this.onPress));
  }

  /** Show a result line, then hand back after a beat. */
  finish(result, line, ms = 1300) {
    if (this.finished) return;
    this.finished = true;
    if (line) this.hint.setText(line).setColor('#f2e6cc');
    this.time.delayedCall(ms, () => this.data_.onDone(result));
  }

  press() {}
}
