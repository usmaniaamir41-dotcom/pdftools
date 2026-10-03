export type DiffOp = { type: 'same' | 'add' | 'del'; text: string };

/**
 * Line-based diff using the classic LCS table, with common prefix/suffix
 * trimmed first so that typical "few edits in a long document" cases stay fast.
 */
export const diffLines = (a: string[], b: string[]): DiffOp[] => {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const head: DiffOp[] = a.slice(0, start).map((text) => ({ type: 'same', text }));
  const tail: DiffOp[] = a.slice(endA).map((text) => ({ type: 'same', text }));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  const n = midA.length;
  const m = midB.length;

  // Guard against pathological sizes (n*m cells): fall back to "all removed / all added".
  if (n * m > 12_000_000) {
    return [
      ...head,
      ...midA.map((text): DiffOp => ({ type: 'del', text })),
      ...midB.map((text): DiffOp => ({ type: 'add', text })),
      ...tail
    ];
  }

  const w = m + 1;
  const table = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * w + j] =
        midA[i] === midB[j]
          ? table[(i + 1) * w + j + 1] + 1
          : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
    }
  }

  const mid: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (midA[i] === midB[j]) {
      mid.push({ type: 'same', text: midA[i] });
      i++;
      j++;
    } else if (table[(i + 1) * w + j] >= table[i * w + j + 1]) {
      mid.push({ type: 'del', text: midA[i++] });
    } else {
      mid.push({ type: 'add', text: midB[j++] });
    }
  }
  while (i < n) mid.push({ type: 'del', text: midA[i++] });
  while (j < m) mid.push({ type: 'add', text: midB[j++] });

  return [...head, ...mid, ...tail];
};
