// Formatting helpers for figures that come out of the science repo's tables.
//
// Every number on this site arrives as a raw float from a CSV. It is formatted here, at the point of
// display, and never rounded on the way in: src/data/site_data.json holds the value the table holds,
// so a reader who checks a page figure against the table finds the same number.

/** A fraction of cells, as a percentage. 0.6872707 -> "69%". */
export function pct(x, digits = 0) {
  if (x === null || x === undefined) return '—';
  return `${(x * 100).toFixed(digits)}%`;
}

/** A fraction, kept as a fraction. 0.6872707 -> "0.69". */
export function frac(x, digits = 2) {
  if (x === null || x === undefined) return '—';
  return x.toFixed(digits);
}

/** A multiple. 6.657 -> "6.7x". */
export function fold(x, digits = 1) {
  if (x === null || x === undefined) return '—';
  return `${x.toFixed(digits)}x`;
}

/** A count, with thousands separators. 1025717 -> "1,025,717". */
export function count(x) {
  if (x === null || x === undefined) return '—';
  return x.toLocaleString('en-US');
}

/** A count, abbreviated for a stat tile. 1025717 -> "1.0M". */
export function short(x) {
  if (x === null || x === undefined) return '—';
  if (x >= 1e6) return `${(x / 1e6).toFixed(1)}M`;
  if (x >= 1e4) return `${Math.round(x / 1e3)}k`;
  if (x >= 1e3) return `${(x / 1e3).toFixed(1)}k`;
  return String(x);
}

/** "FOLH1 + STEAP1" -> "FOLH1 × STEAP1" for an AND gate; NOT gates keep their direction. */
export function pairLabel(a, b, gate) {
  return gate === 'NOT' ? `${a} NOT ${b}` : `${a} × ${b}`;
}

/** Cell-type names from the atlas are long. Keep them readable without changing what they say. */
export function cellType(s) {
  if (!s) return '—';
  return s.replace(/ of epithelium proper of /, ' of ').replace(/^epithelial cell of /, '');
}
