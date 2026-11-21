// Cinematic formation: players in the foreground row, enemies behind them,
// each side ordered by initiative from left to right. Pure math (no Three.js)
// so it is unit-tested directly.

export const SPACING = 2.15;

/**
 * @param {{players:Array<{id:string}>, enemies:Array<{id:string}>, mapW:number, mapH:number, cardScale?:number}} o
 * Characters must already be in initiative order.
 * @returns {Map<string,{x:number,z:number,scale:number,row:number,side:'player'|'enemy'}>}
 */
export function planFormation({ players, enemies, mapW = 32, mapH = 20, cardScale = 1 }) {
  const out = new Map();
  const usable = Math.max(10, Math.min(mapW - 2, 30));
  const zPlayer = Math.min(mapH / 2 - 3, 3.4);
  const zEnemy = zPlayer - 8.6;
  const place = (list, side, z0, dz, boost = 1) => {
    if (!list.length) return;
    // Shrink cards before adding rows, down to 70%; then wrap.
    let scale = cardScale * boost;
    let perRow = Math.max(1, Math.floor(usable / (SPACING * scale)));
    while (list.length > perRow && scale > 0.72 * cardScale) {
      scale -= 0.04;
      perRow = Math.max(1, Math.floor(usable / (SPACING * scale)));
    }
    const rows = Math.ceil(list.length / perRow);
    const per = Math.ceil(list.length / rows);
    list.forEach((c, i) => {
      const row = Math.floor(i / per);
      const inRow = Math.min(per, list.length - row * per);
      const col = i - row * per;
      // Enemy rows sit half a slot off the party so they read between them.
      const stagger = (row + (side === 'enemy' && players.length ? 1 : 0)) % 2 ? SPACING * scale * 0.5 : 0;
      const x = (col - (inRow - 1) / 2) * SPACING * scale + stagger;
      out.set(c.id, { x, z: z0 + row * dz * scale, scale, row, side });
    });
  };
  place(players, 'player', zPlayer, -2.4);
  place(enemies, 'enemy', zEnemy, -2.8, 1.18);
  return out;
}

/** Convert a battle-map square to world coordinates (cell centres). */
export const cellToWorld = (x, y, w, h) => ({ x: x - w / 2 + 0.5, z: y - h / 2 + 0.5 });
export const worldToCell = (x, z, w, h) => ({ x: Math.floor(x + w / 2), y: Math.floor(z + h / 2) });
