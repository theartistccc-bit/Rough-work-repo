import Phaser from 'phaser';
import { makeWalk, paintMissing, queueArt } from '../art/textures.js';

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    queueArt(this);
  }

  create() {
    paintMissing(this);
    makeWalk(this);
    document.getElementById('loading')?.remove();
    this.scene.start('Title');
  }
}
