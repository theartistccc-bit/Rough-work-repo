import { createGame, deserialize, serialize } from './logic/state.js';

const KEY = 'ofion-save-v1';

// One shared place for the running game, the UI mode and held controls.
export const store = {
  g: null,
  modal: false, // a dialog or minigame owns the controls
  held: { left: false, right: false },
};

export function newGame(seed) {
  store.g = createGame(seed);
  return store.g;
}

export function save() {
  try { localStorage.setItem(KEY, serialize(store.g)); } catch { /* storage may be blocked */ }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? deserialize(raw) : null;
  } catch { return null; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
