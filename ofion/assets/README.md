# Art goes here

ChatGPT prompts for every picture are in `PROMPTS.md`.

Drop a picture named after a sprite key and it replaces the placeholder, with no code change.
Restart `npm run dev` (or rebuild) after adding a new file.

- Format: `.png` or `.webp` with transparency. `.jpg` also works for `sky` and portraits (photos are fine there).
- Portraits are fitted inside their frame keeping their own proportions; any size works, 5:6 fills it best. Keep each under ~150 KB (e.g. `.webp` or `.jpg` at quality 80) so the game still loads fast on 3G.
- Each picture is drawn at the size listed below, so keep the aspect ratio.
  Paint at 2x that size for crisp phones.
- Characters stand on their bottom edge, so leave no empty space under the feet.

| key | size (w×h) | what |
|---|---|---|
| player, ini, elder, wrestler | 44×92 | people |
| trader_fishwife, trader_farmer, trader_adorner | 44×92 | market women and men |
| rival_affiong, rival_nkoyo, rival_ekaette | 44×92 | festival rivals |
| hut, hut_ini | 260×210 | your house, Ini's family house |
| stall_fishwife, stall_farmer, stall_adorner | 170×130 | market stalls |
| palm | 140×380 | oil palm (one picture, used 3 times) |
| shade_tree | 300×320 | the tree in the moonlight square |
| mangrove | 220×200 | creek-side mangrove |
| canoe | 170×36 | dugout canoe |
| jetty | 220×70 | fishing jetty |
| fire, glow, moon | 60×70, 320×320, 80×80 | night |
| ring | 240×40 | wrestling ground |
| sky | 960×540 | sky, fixed behind everything |
| bg_far | 1024×260 | distant forest, tiles sideways |
| ground, water | 256×120, 256×140 | tiles sideways |
| bust_plain, bust_ridges, bust_crest, bust_crown | 180×220 | Ini's head and the three contest hairstyles |
| portrait_player, portrait_ini, portrait_elder, portrait_wrestler | 5:6, e.g. 600×720 | faces shown in dialogs |
| portrait_fishwife, portrait_farmer, portrait_adorner | 5:6 | the three traders' faces |
| portrait_affiong, portrait_nkoyo, portrait_ekaette | 5:6 | rivals' faces (contest screen) |
| icon_fish, icon_yam, icon_plantain, icon_periwinkle, icon_palmwine, icon_palmoil, icon_thread, icon_beads, icon_camwood, icon_comb, icon_pot | 32×32 | goods |

## Sound and music

All sound is made in code, so it costs nothing to download. Drop a recording here to replace any of it, with no code change:

| File | Plays |
|---|---|
| `music_day.mp3` | daytime music, anywhere in the village (loops) |
| `music_night.mp3` | late-night music (loops) |
| `music_moonlight.mp3` | drums in the village square, 20:00 to midnight (loops) |
| `music_festival.mp3` | the contest, 16:00–19:00 on festival days (loops) |
| `sfx_click`, `sfx_open` | menu tap, menu opens |
| `sfx_bite`, `sfx_splash`, `sfx_catch` | fishing |
| `sfx_grip`, `sfx_slip`, `sfx_wine` | palm climbing |
| `sfx_thud`, `sfx_cheer`, `sfx_lose` | wrestling |
| `sfx_good`, `sfx_miss` | plaiting moves |
| `sfx_reveal`, `sfx_win` | contest scores, Ini wins |
| `sfx_trade`, `sfx_eat`, `sfx_sleep`, `sfx_chapter` | barter, eating, sleeping, story chapter done |

`.mp3`, `.ogg`, `.wav` and `.m4a` all work. Keep loops short (30–60 s) and under about 500 KB each so the game still loads fast. A recording is fetched the first time it's needed, not at startup.
