import Phaser from 'phaser';
import { paintMissing, queueArt } from '../art/textures.js';

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    queueArt(this);
  }

  create() {
    paintMissing(this);
    document.getElementById('loading')?.remove();
    this.scene.start('Title');
  }
}
