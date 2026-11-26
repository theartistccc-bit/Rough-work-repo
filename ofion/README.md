# Ọfiọñ

A 2D browser game of pre-colonial Efik/Ibibio village life on the Calabar coast, built with Phaser 3 and Vite.

```bash
npm install
npm run dev      # play at the printed localhost address
npm test         # rule tests (barter, hunger, contest, day cycle, courtship, minigames)
npm run build    # static site in dist/ (works from any sub-path)
```

## How to play

Walk with ◀ ▶ (A/D or the arrow keys). Act with ● (E, Space or Enter). Q or ✕ opens your satchel to eat. In menus, use 1–9 or tap.

On a phone the on-screen buttons appear automatically.

| Place (left to right) | What you do |
|---|---|
| Creek jetty | Fish: wait for the float to dip, then pull. Dawn and dusk give a wider bite window. |
| Your house | Eat yam, fish, or a yam-and-fish meal. Sleep after 19:00 (this also saves). |
| Market (08:00–17:00) | Barter goods for goods with three traders. There is no money. Rates depend on what each trader wants, and fall the more of one good they take in a day. |
| Village square at night (20:00–24:00) | Hear the elder's tales (+wisdom) and wrestle under the moon (+renown). |
| Ini's compound | Talk once a day (better with wisdom) and bring gifts she likes. |
| Palm grove | Climb by alternating ◀ ▶ to collect palm wine, once per tree per day. |
| Festival (every 4th day, 16:00–19:00) | Dress Ini's hair against 3 rivals. Scored on craft (plaiting), adornment (thread, beads, camwood, comb) and spirit (Ini's trust and your renown). |

Hunger drains over time, faster while walking. When hungry you walk slower; when starving you can't climb or wrestle.

## Changing the rules

Every number lives in `src/logic/config.js`: barter worth and trader wants, hunger rates, food values, contest weights, rival profiles, festival timing, Efik names and tales. The tests read the same config. The rules (`src/logic/`) are pure JS with no Phaser, so they are tested directly.

## Replacing the art

See `assets/README.md`. Drop `assets/<key>.png` (for example `hut.png`) and it replaces the painted placeholder at the same on-screen size. No code changes are needed; restart the dev server or rebuild.

## Scripts

- `npm run shots`: builds, plays through every scene in headless Chromium, and saves screenshots to `screenshots/latest`.
- `npm run perf`: load time on throttled 3G and fps with the CPU slowed 6× (an emulation, see below).

## Performance notes

- Bundle: about 361 KB gzipped (mostly Phaser). Placeholder art is painted at boot, so there are no image downloads.
- All static art, HUD panels and the star sky are drawn once into textures. Day and night are a per-object tint, not full-screen overlays, so overdraw stays low.
- Measured in this container (Chromium with software WebGL, which fills every pixel on the CPU):
  - Load on emulated 3G with the CPU slowed 6×: about 4.0 s.
  - Frame rate, CPU slowed 6×: about 23 fps. Unthrottled: about 34 fps.
  - With drawing hidden, the game loop alone runs at about 54 fps on the 6× slower CPU.

  Software rendering is far slower than a phone GPU, so these numbers are a pessimistic proxy. 60 fps on a cheap Android phone has **not** been confirmed on real hardware.
