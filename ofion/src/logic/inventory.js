import { GOODS } from './config.js';

export const createInventory = (start = {}) => ({ ...start });
export const count = (inv, good) => inv[good] ?? 0;
export const has = (inv, good, n = 1) => count(inv, good) >= n;

export function add(inv, good, n = 1) {
  if (!GOODS[good]) throw new Error(`Unknown good: ${good}`);
  inv[good] = count(inv, good) + n;
}

export function remove(inv, good, n = 1) {
  if (!has(inv, good, n)) return false;
  inv[good] -= n;
  if (inv[good] === 0) delete inv[good];
  return true;
}
