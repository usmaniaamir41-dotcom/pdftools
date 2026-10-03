/**
 * Page-range parsing shared by Split, Rotate, Delete and Extract.
 *
 * Accepted syntax (1-based, comma separated):
 *   "1-3, 5"   pages 1,2,3 and 5
 *   "7-"       page 7 to the last page
 *   "-3"       pages 1 to 3
 *   "last"     final page,  "all" / "odd" / "even" keywords
 */

const clampPage = (n: number, total: number) => Math.max(1, Math.min(total, n));

const parseToken = (raw: string, total: number): number[] => {
  const token = raw.trim().toLowerCase();
  if (!token) return [];

  if (token === 'all') return Array.from({ length: total }, (_, i) => i + 1);
  if (token === 'odd') return Array.from({ length: total }, (_, i) => i + 1).filter((p) => p % 2 === 1);
  if (token === 'even') return Array.from({ length: total }, (_, i) => i + 1).filter((p) => p % 2 === 0);

  const num = (s: string): number => {
    const v = s.trim();
    if (v === 'last') return total;
    if (!/^\d+$/.test(v)) throw new Error(`"${raw.trim()}" is not a valid page number or range.`);
    return parseInt(v, 10);
  };

  if (token.includes('-')) {
    const [a, b] = token.split('-');
    const start = a.trim() === '' ? 1 : num(a);
    const end = b.trim() === '' ? total : num(b);
    if (start > total && end > total) {
      throw new Error(`Range "${raw.trim()}" is outside the document (${total} page${total === 1 ? '' : 's'}).`);
    }
    const s = clampPage(Math.min(start, end), total);
    const e = clampPage(Math.max(start, end), total);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }

  const p = num(token);
  if (p < 1 || p > total) {
    throw new Error(`Page ${p} is outside the document (${total} page${total === 1 ? '' : 's'}).`);
  }
  return [p];
};

/** Each comma-separated token becomes its own group of pages (used by Split). */
export const parsePageSegments = (spec: string, total: number): number[][] => {
  const segments = spec
    .split(',')
    .map((t) => parseToken(t, total))
    .filter((s) => s.length > 0);
  if (segments.length === 0) {
    throw new Error(`Enter at least one page or range (the document has ${total} page${total === 1 ? '' : 's'}).`);
  }
  return segments;
};

/** Flat, de-duplicated list in the order written (used by Extract / Delete / Rotate). */
export const parsePageRanges = (spec: string, total: number): number[] => {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const seg of parsePageSegments(spec, total)) {
    for (const p of seg) {
      if (!seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
  }
  return out;
};
