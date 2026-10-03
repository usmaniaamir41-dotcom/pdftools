import { jsPDF } from 'jspdf';
import { createCanvas, canvasToBlob } from './canvas';

/* ------------------------------------------------------------------ */
/* Tiny markdown -> block parser                                        */
/* ------------------------------------------------------------------ */

type Block =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'li'; text: string; marker: string; depth: number }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; lines: string[] }
  | { kind: 'hr' }
  | { kind: 'blank' }
  | { kind: 'plain'; text: string };

const stripInline = (s: string): string =>
  s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~(.*?)~~/g, '$1');

export const parseMarkdown = (md: string): Block[] => {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      blocks.push({ kind: 'p', text: stripInline(para.join(' ')) });
      para = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      blocks.push({ kind: 'code', lines: code });
      continue;
    }
    if (/^\s*$/.test(line)) {
      flush();
      blocks.push({ kind: 'blank' });
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push({ kind: 'h', level: Math.min(3, h[1].length) as 1 | 2 | 3, text: stripInline(h[2].trim()) });
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      blocks.push({ kind: 'hr' });
      continue;
    }
    const q = /^\s*>\s?(.*)$/.exec(line);
    if (q) {
      flush();
      blocks.push({ kind: 'quote', text: stripInline(q[1]) });
      continue;
    }
    const ul = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (ul) {
      flush();
      blocks.push({ kind: 'li', marker: '\u2022', depth: Math.floor(ul[1].length / 2), text: stripInline(ul[2]) });
      continue;
    }
    const ol = /^(\s*)(\d+)[.)]\s+(.*)$/.exec(line);
    if (ol) {
      flush();
      blocks.push({ kind: 'li', marker: `${ol[2]}.`, depth: Math.floor(ol[1].length / 2), text: stripInline(ol[3]) });
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
};

/* ------------------------------------------------------------------ */
/* Surfaces: vector (jsPDF) and raster (canvas) share one layout engine */
/* ------------------------------------------------------------------ */

interface Style {
  size: number;
  bold?: boolean;
  italic?: boolean;
  mono?: boolean;
  color?: string;
}

interface Surface {
  readonly pageW: number;
  readonly pageH: number;
  setStyle(s: Style): void;
  width(text: string): number;
  text(text: string, x: number, baselineY: number): void;
  line(x1: number, y1: number, x2: number, y2: number, color: string, w?: number): void;
  rect(x: number, y: number, w: number, h: number, color: string): void;
  newPage(): void;
  finish(): Promise<Uint8Array>;
}

const A4 = { w: 595.28, h: 841.89 };

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const v = m ? parseInt(m[1], 16) : 0;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};

class VectorSurface implements Surface {
  readonly pageW = A4.w;
  readonly pageH = A4.h;
  private doc = new jsPDF({ unit: 'pt', format: 'a4' });

  setStyle(s: Style) {
    const family = s.mono ? 'courier' : 'helvetica';
    const style = s.bold && s.italic ? 'bolditalic' : s.bold ? 'bold' : s.italic ? 'italic' : 'normal';
    this.doc.setFont(family, style);
    this.doc.setFontSize(s.size);
    const [r, g, b] = hexToRgb(s.color ?? '#111827');
    this.doc.setTextColor(r, g, b);
  }
  width(text: string) {
    return this.doc.getTextWidth(text);
  }
  text(text: string, x: number, y: number) {
    this.doc.text(text, x, y);
  }
  line(x1: number, y1: number, x2: number, y2: number, color: string, w = 0.75) {
    const [r, g, b] = hexToRgb(color);
    this.doc.setDrawColor(r, g, b);
    this.doc.setLineWidth(w);
    this.doc.line(x1, y1, x2, y2);
  }
  rect(x: number, y: number, w: number, h: number, color: string) {
    const [r, g, b] = hexToRgb(color);
    this.doc.setFillColor(r, g, b);
    this.doc.rect(x, y, w, h, 'F');
  }
  newPage() {
    this.doc.addPage();
  }
  async finish() {
    return new Uint8Array(this.doc.output('arraybuffer'));
  }
}

/** Used when the text contains scripts the built-in PDF fonts can't draw (Hindi, Kannada, Arabic, CJK...). */
class RasterSurface implements Surface {
  readonly pageW = A4.w;
  readonly pageH = A4.h;
  private readonly scale = 2;
  private pages: HTMLCanvasElement[] = [];
  private ctx!: CanvasRenderingContext2D;

  constructor() {
    this.newPage();
  }

  setStyle(s: Style) {
    const family = s.mono
      ? 'ui-monospace, Menlo, Consolas, monospace'
      : '"Noto Sans", "Noto Sans Devanagari", "Noto Sans Kannada", "Segoe UI", system-ui, sans-serif';
    this.ctx.font = `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${s.size * this.scale}px ${family}`;
    this.ctx.fillStyle = s.color ?? '#111827';
  }
  width(text: string) {
    return this.ctx.measureText(text).width / this.scale;
  }
  text(text: string, x: number, y: number) {
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.fillText(text, x * this.scale, y * this.scale);
  }
  line(x1: number, y1: number, x2: number, y2: number, color: string, w = 0.75) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = w * this.scale;
    this.ctx.beginPath();
    this.ctx.moveTo(x1 * this.scale, y1 * this.scale);
    this.ctx.lineTo(x2 * this.scale, y2 * this.scale);
    this.ctx.stroke();
  }
  rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x * this.scale, y * this.scale, w * this.scale, h * this.scale);
  }
  newPage() {
    const c = createCanvas(this.pageW * this.scale, this.pageH * this.scale);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    this.pages.push(c);
    this.ctx = ctx;
  }
  async finish() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    for (let i = 0; i < this.pages.length; i++) {
      if (i > 0) doc.addPage();
      const blob = await canvasToBlob(this.pages[i], 'image/jpeg', 0.92);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      doc.addImage(bytes, 'JPEG', 0, 0, this.pageW, this.pageH);
    }
    return new Uint8Array(doc.output('arraybuffer'));
  }
}

/* ------------------------------------------------------------------ */
/* Layout                                                                */
/* ------------------------------------------------------------------ */

const WIN_ANSI_EXTRA = '\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178';

/** True when the text has characters the standard PDF fonts cannot render. */
export const needsUnicodeRendering = (text: string): boolean => {
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code > 255 && !WIN_ANSI_EXTRA.includes(ch)) return true;
  }
  return false;
};

const MARGIN = 54;

const wrap = (s: Surface, text: string, maxWidth: number): string[] => {
  const out: string[] = [];
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let cur = '';
    for (const word of words) {
      const trial = cur ? `${cur} ${word}` : word;
      if (s.width(trial) <= maxWidth) {
        cur = trial;
        continue;
      }
      if (cur) out.push(cur);
      // Hard-break a single word longer than the line (long URLs, scripts without spaces)
      if (s.width(word) > maxWidth) {
        let chunk = '';
        for (const ch of word) {
          if (s.width(chunk + ch) > maxWidth && chunk) {
            out.push(chunk);
            chunk = ch;
          } else chunk += ch;
        }
        cur = chunk;
      } else cur = word;
    }
    out.push(cur);
  }
  return out;
};

class Cursor {
  y = MARGIN;
  s: Surface;
  constructor(s: Surface) {
    this.s = s;
  }
  ensure(h: number) {
    if (this.y + h > this.s.pageH - MARGIN) {
      this.s.newPage();
      this.y = MARGIN;
    }
  }
}

const layoutBlocks = async (blocks: Block[], s: Surface): Promise<Uint8Array> => {
  const cur = new Cursor(s);
  const contentW = s.pageW - MARGIN * 2;

  const writeLines = (lines: string[], style: Style, x: number, lineH: number) => {
    s.setStyle(style);
    for (const ln of lines) {
      cur.ensure(lineH);
      s.setStyle(style);
      s.text(ln, x, cur.y + style.size);
      cur.y += lineH;
    }
  };

  const heading = { 1: 24, 2: 18, 3: 14 } as const;

  for (const b of blocks) {
    switch (b.kind) {
      case 'blank':
        cur.y += 6;
        break;
      case 'plain': {
        if (b.text === '') {
          cur.y += 15;
          break;
        }
        s.setStyle({ size: 11 });
        writeLines(wrap(s, b.text, contentW), { size: 11 }, MARGIN, 15);
        break;
      }
      case 'hr':
        cur.ensure(14);
        s.line(MARGIN, cur.y + 6, s.pageW - MARGIN, cur.y + 6, '#cbd5e1');
        cur.y += 14;
        break;
      case 'h': {
        const size = heading[b.level];
        cur.y += b.level === 1 ? 6 : 4;
        s.setStyle({ size, bold: true, color: '#0f172a' });
        const lines = wrap(s, b.text, contentW);
        cur.ensure(size * 1.3 * Math.min(lines.length, 2));
        writeLines(lines, { size, bold: true, color: '#0f172a' }, MARGIN, size * 1.3);
        cur.y += 4;
        break;
      }
      case 'p': {
        s.setStyle({ size: 11 });
        writeLines(wrap(s, b.text, contentW), { size: 11 }, MARGIN, 16);
        cur.y += 4;
        break;
      }
      case 'li': {
        const indent = MARGIN + 16 + b.depth * 18;
        s.setStyle({ size: 11 });
        const lines = wrap(s, b.text, s.pageW - MARGIN - indent - 4);
        cur.ensure(16);
        s.setStyle({ size: 11 });
        s.text(b.marker, indent - 14, cur.y + 11);
        writeLines(lines, { size: 11 }, indent, 16);
        cur.y += 2;
        break;
      }
      case 'quote': {
        s.setStyle({ size: 11, italic: true, color: '#475569' });
        const lines = wrap(s, b.text, contentW - 20);
        const startY = cur.y;
        cur.ensure(16);
        writeLines(lines, { size: 11, italic: true, color: '#475569' }, MARGIN + 14, 16);
        if (cur.y > startY) s.line(MARGIN + 4, startY, MARGIN + 4, cur.y, '#a5b4fc', 2);
        cur.y += 4;
        break;
      }
      case 'code': {
        s.setStyle({ size: 9.5, mono: true });
        const lines = b.lines.flatMap((l) => wrap(s, l === '' ? ' ' : l.replace(/\t/g, '    '), contentW - 16));
        const lh = 13;
        let i = 0;
        while (i < lines.length) {
          cur.ensure(lh + 8);
          const room = Math.max(1, Math.floor((s.pageH - MARGIN - cur.y - 8) / lh));
          const chunk = lines.slice(i, i + room);
          s.rect(MARGIN, cur.y, contentW, chunk.length * lh + 8, '#f1f5f9');
          cur.y += 4;
          for (const ln of chunk) {
            s.setStyle({ size: 9.5, mono: true, color: '#1e293b' });
            s.text(ln, MARGIN + 8, cur.y + 9.5);
            cur.y += lh;
          }
          cur.y += 4;
          i += chunk.length;
        }
        cur.y += 4;
        break;
      }
    }
  }
  return s.finish();
};

/* ------------------------------------------------------------------ */
/* Public API                                                            */
/* ------------------------------------------------------------------ */

export const textToPDF = async (text: string): Promise<Uint8Array> => {
  if (!text.trim()) throw new Error('Enter some text first.');
  const surface: Surface = needsUnicodeRendering(text) ? new RasterSurface() : new VectorSurface();
  const blocks: Block[] = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l): Block => ({ kind: 'plain', text: l.trim() === '' ? '' : l.replace(/\t/g, '    ') }));
  return layoutBlocks(blocks, surface);
};

export const markdownToPDF = async (md: string): Promise<Uint8Array> => {
  if (!md.trim()) throw new Error('Enter some Markdown first.');
  const surface: Surface = needsUnicodeRendering(md) ? new RasterSurface() : new VectorSurface();
  return layoutBlocks(parseMarkdown(md), surface);
};
