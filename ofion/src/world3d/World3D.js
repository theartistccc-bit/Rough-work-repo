// The 3D village, drawn with three.js underneath the Phaser HUD.
// Scenery is low-poly geometry. People are the game's own pictures standing as cut-outs that face
// the camera; each one mirrors a (hidden) Phaser image, so walking, dancing, tints and visibility
// all come from the existing game code.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLACES, WORLD_W } from '../world.js';
import { lightLevel, phaseAt } from '../logic/dayCycle.js';
import { LANES, PERSON_SCALE, cameraFor, skyAt, sunPosition, toWorldX, toWorldY } from './layout.js';

const C = {
  earth: 0xa8784a, sand: 0xd9b27a, mud: 0xb07a4a, mudLight: 0xc49060, thatch: 0xa07c3c, thatchDark: 0x7a5a2a,
  wood: 0x7a4f2a, trunk: 0x6a4a2e, palm: 0x4f7a2e, palmDark: 0x3a5f24, leaf: 0x2f4a2a, water: 0x3d6b66,
  camwood: 0x8e2f1f, indigo: 0x2c3a6b, ochre: 0xc8873a, cream: 0xf2e6cc, coral: 0xd5543a, fire: 0xf0a030,
};

const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

export class World3D {
  constructor() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const cv = this.renderer.domElement;
    cv.id = 'world3d';
    Object.assign(cv.style, { position: 'fixed', inset: '0', zIndex: '0', display: 'none' });
    document.body.prepend(cv);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xf2cf96, 26, 90);
    this.camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.1, 160);
    this.camX = toWorldX(PLACES.playerStart);

    this.hemi = new THREE.HemisphereLight(0xfff0d8, 0x6a4a2e, 1);
    this.sun = new THREE.DirectionalLight(0xfff2dc, 1.4);
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.bindings = [];
    this.texCache = new Map();
    this.build();
    this.mergeStatic();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  show(on) {
    this.renderer.domElement.style.display = on ? 'block' : 'none';
    this.active = on;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ scenery
  add(mesh, x, y, z) {
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
  }

  build() {
    const creek = toWorldX(PLACES.creekEdge);
    const end = toWorldX(WORLD_W) + 6;
    // ground and creek
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(end - creek + 2, 60), lam(0xc0905a));
    ground.rotation.x = -Math.PI / 2;
    this.add(ground, (creek + end) / 2 + 1, 0, -20);
    const path = new THREE.Mesh(new THREE.PlaneGeometry(end - creek, 2.4), lam(C.sand));
    path.rotation.x = -Math.PI / 2;
    this.add(path, (creek + end) / 2, 0.01, 0.5);
    this.waterTex = this.rippleTexture();
    const water = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), new THREE.MeshLambertMaterial({ color: C.water, map: this.waterTex }));
    water.rotation.x = -Math.PI / 2;
    this.add(water, creek - 20, -0.12, -20);
    const bank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 60), lam(0x8a5a34));
    this.add(bank, creek, -0.05, -20);

    // distant forest and palms, one instanced mesh each so they cost almost nothing
    const forest = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), lam(C.leaf), 70);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 70; i++) {
      const s = 1.8 + ((i * 37) % 10) / 5;
      m.compose(new THREE.Vector3(-14 + i * 0.85, s * 0.5, -24 - ((i * 13) % 6)), new THREE.Quaternion(), new THREE.Vector3(s * 1.4, s, s));
      forest.setMatrixAt(i, m);
    }
    this.scene.add(forest);
    for (let i = 0; i < 18; i++) this.palm(-8 + i * 2.9, -16 - (i % 3) * 2.5, 0.9 + (i % 4) * 0.12);

    // the creek side: mangroves, jetty, canoe
    this.mangrove(1.0, -1.8);
    this.mangrove(-0.6, -3.5, 1.3);
    this.mangrove(2.6, -4.2, 0.9);
    this.jetty(toWorldX(PLACES.fishingSpot) - 1.1, 0.5);
    this.canoe(toWorldX(PLACES.canoe) - 0.5, 1.6);

    // the village
    this.hut(toWorldX(PLACES.home), LANES.huts, C.mud, C.camwood);
    this.hut(toWorldX(PLACES.iniHut), LANES.huts, C.mudLight, C.indigo);
    this.hut(toWorldX(PLACES.home) - 3.6, LANES.huts - 3, C.mud, C.ochre, 0.8);
    this.hut(toWorldX(PLACES.home) + 4.2, LANES.huts - 4, C.mudLight, C.indigo, 0.75);
    this.hut(toWorldX(PLACES.iniHut) + 3.8, LANES.huts - 2.5, C.mudLight, C.camwood, 0.85);
    this.hut(toWorldX(PLACES.elder) + 3.4, LANES.huts - 3.5, C.mud, C.ochre, 0.8);
    const stallCloth = { fishwife: C.water, farmer: C.ochre, adorner: C.camwood };
    for (const [id, px] of Object.entries(PLACES.traders)) this.stall(toWorldX(px), LANES.stalls, stallCloth[id]);
    this.shadeTree(toWorldX(PLACES.elder) - 0.6, LANES.tree);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), lam(0xe0c28a));
    ring.rotation.x = -Math.PI / 2;
    ring.scale.set(1.3, 0.75, 1);
    this.add(ring, toWorldX(PLACES.ring), 0.015, -0.6);
    this.fire(toWorldX(PLACES.elder) + 0.8, -0.2);
    for (const px of PLACES.palms) this.palm(toWorldX(px), LANES.palms, 1.15, true);

    // sky: moon and stars, kept near the camera
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1cc, fog: false }));
    this.scene.add(this.moon);
    const starGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < 220; i++) pts.push((i * 97) % 120 - 60, 8 + ((i * 53) % 30), -50 - ((i * 31) % 10));
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff4d6, size: 0.25, transparent: true, fog: false }));
    this.scene.add(this.stars);
  }

  /**
   * Bake all still scenery into one mesh per colour. Hundreds of small meshes become about a dozen
   * draw calls, which is what keeps cheap phones smooth.
   */
  mergeStatic() {
    this.scene.updateMatrixWorld(true);
    const keep = new Set([this.flame, this.moon, this.stars, this.fireLight]);
    const groups = new Map();
    const victims = [];
    this.scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || keep.has(o) || o.material.map) return;
      const key = `${o.material.type}:${o.material.color.getHex()}`;
      if (!groups.has(key)) groups.set(key, { material: o.material, geos: [] });
      const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      groups.get(key).geos.push(g);
      victims.push(o);
    });
    for (const o of victims) o.removeFromParent();
    for (const { material, geos } of groups.values()) {
      const merged = mergeGeometries(geos, false);
      if (merged) this.scene.add(new THREE.Mesh(merged, material));
    }
    // drop the now-empty groups
    this.scene.children.filter((c) => c.isGroup && c.children.length === 0).forEach((c) => c.removeFromParent());
  }

  rippleTexture() {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(160,210,200,0.9)'; g.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const x = (i * 53) % 128; const y = (i * 29) % 128;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 10);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /** Rectangular mud-walled house with a steep gabled palm-thatch roof. */
  hut(x, z, wall, accent, k = 1) {
    const g = new THREE.Group();
    const w = 3.2 * k; const h = 1.7 * k; const d = 2.4 * k;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(wall));
    walls.position.y = h / 2;
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.18 * k, d + 0.02), lam(accent));
    band.position.y = 0.35 * k;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.6 * k, 1.1 * k), new THREE.MeshBasicMaterial({ color: 0x241408 }));
    door.position.set(0, 0.55 * k, d / 2 + 0.01);
    // a triangular prism for the roof, ridge along x, with a deep overhang
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, w + 0.6 * k, 3, 1), lam(C.thatch));
    roof.rotation.z = Math.PI / 2;
    roof.rotation.x = Math.PI / 2;
    roof.scale.set(1, 1.5 * k, 1.05 * k);
    roof.position.y = h + 0.45 * k;
    const eave = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7 * k, 0.12, d + 0.9 * k), lam(C.thatchDark));
    eave.position.y = h + 0.02;
    g.add(walls, band, door, roof, eave);
    g.position.set(x, 0, z);
    this.scene.add(g);
  }

  stall(x, z, cloth) {
    const g = new THREE.Group();
    const post = new THREE.CylinderGeometry(0.05, 0.06, 1.7, 5);
    for (const [px, pz] of [[-0.8, -0.5], [0.8, -0.5], [-0.8, 0.5], [0.8, 0.5]]) {
      const p = new THREE.Mesh(post, lam(C.wood)); p.position.set(px, 0.85, pz); g.add(p);
    }
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.1, 3), lam(C.thatch));
    roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 2; roof.scale.set(1, 0.7, 0.75);
    roof.position.y = 1.95;
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1), lam(C.wood)); table.position.y = 0.8;
    const front = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.04), lam(cloth)); front.position.set(0, 0.42, 0.5);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.18, 7), lam(C.thatchDark)); basket.position.set(-0.4, 0.93, 0);
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 5), lam(0xa4492b)); pot.position.set(0.4, 0.98, 0);
    g.add(roof, table, front, basket, pot);
    g.position.set(x, 0, z);
    this.scene.add(g);
  }

  /** Oil palm: rough trunk, drooping crown of fronds, fruit bunch and the tapper's gourd. */
  palm(x, z, k = 1, gourd = false) {
    const g = new THREE.Group();
    const h = 4.4 * k;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * k, 0.21 * k, h, 6), lam(C.trunk));
    trunk.position.y = h / 2;
    g.add(trunk);
    const frond = new THREE.ConeGeometry(0.22 * k, 2.6 * k, 4);
    frond.translate(0, 1.3 * k, 0);
    for (let i = 0; i < 11; i++) {
      const f = new THREE.Mesh(frond, lam(i % 2 ? C.palm : C.palmDark));
      f.position.y = h;
      f.rotation.y = (i / 11) * Math.PI * 2;
      f.rotation.z = 1.05 + (i % 3) * 0.18; // droop outward
      f.scale.z = 0.25;
      g.add(f);
    }
    const fruit = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 * k), lam(C.coral));
    fruit.position.set(0.15, h - 0.25, 0.15);
    g.add(fruit);
    if (gourd) {
      const gd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), lam(C.ochre));
      gd.position.set(-0.22, h - 0.7, 0.1);
      g.add(gd);
    }
    g.rotation.z = ((x * 7) % 3 - 1) * 0.04; // a slight lean
    g.position.set(x, 0, z);
    this.scene.add(g);
  }

  shadeTree(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 2.6, 7), lam(C.trunk));
    trunk.position.y = 1.3;
    g.add(trunk);
    for (const [px, py, pz, s] of [[0, 3.4, 0, 2.1], [-1.2, 3.0, 0.3, 1.5], [1.2, 3.1, -0.2, 1.6], [0.2, 4.2, -0.3, 1.4]]) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), lam(C.leaf));
      c.position.set(px, py, pz);
      g.add(c);
    }
    g.position.set(x, 0, z);
    this.scene.add(g);
  }

  mangrove(x, z, k = 1) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.1 * k, 4), lam(0x3a2a1c));
      r.position.set(Math.cos(i * 1.3) * 0.4 * k, 0.4 * k, Math.sin(i * 1.3) * 0.4 * k);
      r.rotation.z = Math.cos(i * 1.3) * 0.5;
      g.add(r);
    }
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 * k, 0), lam(C.leaf));
    c.position.y = 1.5 * k;
    c.scale.y = 0.7;
    g.add(c);
    g.position.set(x, -0.1, z);
    this.scene.add(g);
  }

  jetty(x, z) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1.1), lam(C.wood));
    this.add(deck, x, 0.08, z);
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 5), lam(0x5a3a1e));
      this.add(p, x - 1.1 + i * 0.75, -0.25, z + 0.55);
    }
  }

  canoe(x, z) {
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.5, 3, 6), lam(C.wood));
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(0.5, 1, 1);
    this.add(hull, x, -0.06, z);
  }

  fire(x, z) {
    const logs = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.12, 7), lam(0x3a2410));
    this.add(logs, x, 0.06, z);
    this.flame = this.add(new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 6), new THREE.MeshBasicMaterial({ color: C.fire })), x, 0.45, z);
    this.fireLight = this.add(new THREE.PointLight(0xffa040, 0, 9, 1.6), x, 1, z + 0.3);
  }

  // ------------------------------------------------------------------ people (cut-outs)
  /** One three.js texture per Phaser texture source, so pictures are uploaded once. */
  baseTexture(phaserTex) {
    const src = phaserTex.getSourceImage();
    let t = this.texCache.get(src);
    if (!t) {
      t = src instanceof HTMLCanvasElement ? new THREE.CanvasTexture(src) : new THREE.Texture(src);
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
      this.texCache.set(src, t);
    }
    return t;
  }

  /**
   * Mirror a Phaser image as a cut-out. opts: { z, anchor: () => px, shadow }.
   * anchor: the x the person stands at, so offsets within a figure (legs) scale with the figure.
   */
  bind(img, { z = 0, anchor = null, shadow = false } = {}) {
    const map = this.baseTexture(img.texture).clone();
    map.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map, transparent: true, alphaTest: 0.08, fog: true });
    const sprite = new THREE.Sprite(mat);
    this.scene.add(sprite);
    let blob = null;
    if (shadow) {
      blob = new THREE.Mesh(new THREE.CircleGeometry(0.32, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
      blob.rotation.x = -Math.PI / 2;
      blob.scale.y = 0.45;
      this.scene.add(blob);
    }
    const b = { img, sprite, map, z, anchor, blob, frame: null, flip: null };
    this.bindings.push(b);
    return b;
  }

  syncBinding(b) {
    const { img, sprite, map } = b;
    const visible = img.visible && img.alpha > 0.01 && img.active !== false;
    sprite.visible = visible;
    if (b.blob) b.blob.visible = img.visible;
    if (!visible && !b.blob) return;
    // frame -> UV window (also handles flipping)
    const f = img.frame;
    if (f !== b.frame || img.flipX !== b.flip) {
      const src = f.source;
      const u0 = f.cutX / src.width; const uw = f.cutWidth / src.width;
      const v0 = 1 - (f.cutY + f.cutHeight) / src.height; const vh = f.cutHeight / src.height;
      map.repeat.set(img.flipX ? -uw : uw, vh);
      map.offset.set(img.flipX ? u0 + uw : u0, v0);
      b.frame = f; b.flip = img.flipX;
    }
    const w = img.displayWidth * PERSON_SCALE;
    const h = img.displayHeight * PERSON_SCALE;
    sprite.scale.set(w, h, 1);
    sprite.center.set(img.originX, 1 - img.originY);
    const ax = b.anchor ? b.anchor() : img.x;
    sprite.position.set(toWorldX(ax) + (img.x - ax) * PERSON_SCALE, toWorldY(img.y), b.z + img.depth * 0.002);
    sprite.material.rotation = -img.rotation;
    sprite.material.color.setHex(img.tintTopLeft ?? 0xffffff);
    if (b.blob) b.blob.position.set(toWorldX(ax), 0.02, b.z);
  }

  // ------------------------------------------------------------------ per frame
  update(playerPx, minute, timeMs) {
    if (!this.active) return;
    const target = cameraFor(playerPx);
    this.camX += (target.pos[0] - this.camX) * 0.08;
    this.camera.position.set(this.camX, target.pos[1], target.pos[2]);
    this.camera.lookAt(this.camX, target.look[1], target.look[2]);

    const light = lightLevel(minute);
    const s = skyAt(light);
    this.scene.background = this.bgColor ??= new THREE.Color();
    this.bgColor.setHex(s.sky);
    this.scene.fog.color.setHex(s.sky);
    this.hemi.intensity = s.hemiIntensity;
    this.sun.intensity = s.sunIntensity;
    this.sun.color.setHex(s.sunColor);
    const [sx, sy, sz] = sunPosition(minute, this.camX);
    this.sun.position.set(sx, Math.max(sy, 1), sz);
    this.sun.target.position.set(this.camX, 0, -2);
    this.moon.visible = s.night > 0.05;
    this.moon.position.set(this.camX + 9, 11, -40);
    this.stars.material.opacity = s.night;
    this.stars.position.x = this.camX;
    const fireOn = ['night', 'dusk'].includes(phaseAt(minute));
    this.flame.visible = fireOn;
    this.fireLight.intensity = fireOn ? 2.2 + Math.sin(timeMs / 90) * 0.4 + Math.sin(timeMs / 37) * 0.2 : 0;
    this.flame.scale.y = 1 + Math.sin(timeMs / 70) * 0.12;
    this.waterTex.offset.x = (timeMs / 40000) % 1;

    for (const b of this.bindings) this.syncBinding(b);
    this.renderer.render(this.scene, this.camera);
  }
}
