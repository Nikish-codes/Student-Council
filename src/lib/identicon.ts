/**
 * Deterministic 5×5 symmetric identicon derived from a ticket id/code. Gives
 * each ticket a unique visual fingerprint staff can eyeball for tampering. Pure
 * (FNV-1a hash, no imports) so it runs on client or server.
 */

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Returns an inline SVG string for the identicon. `color` should be a CSS color
 * (e.g. the event's accent). Cells are laid out on a 5-wide grid mirrored across
 * the vertical axis, so 15 bits of the hash decide the pattern.
 */
export function identiconSvg(seed: string, color = "currentColor"): string {
  const h = fnv1a(seed);
  const cells: boolean[] = [];
  // 3 columns × 5 rows = 15 bits; mirror columns 0,1 to columns 4,3.
  for (let i = 0; i < 15; i++) cells.push(((h >> i) & 1) === 1);

  const rects: string[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if (!cells[row * 3 + col]) continue;
      const mirror = 4 - col;
      for (const c of col === mirror ? [col] : [col, mirror]) {
        rects.push(`<rect x="${c}" y="${row}" width="1" height="1"/>`);
      }
    }
  }
  return `<svg viewBox="0 0 5 5" xmlns="http://www.w3.org/2000/svg" fill="${color}" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
}
