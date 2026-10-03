import { PDFDocument, StandardFonts, degrees } from '@cantoo/pdf-lib';
import { createCanvas } from '@napi-rs/canvas';

export const toFile = (bytes: Uint8Array | Buffer, name: string, type = 'application/pdf') =>
  new File([new Uint8Array(bytes)], name, { type });

/** A PDF whose page i contains the text "<label> page i". */
export const makePdf = async (pages: number, label = 'Doc', opts: { rotate?: number[] } = {}) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const p = pdf.addPage([595, 842]);
    p.drawText(`${label} page ${i}`, { x: 72, y: 700, size: 24, font });
    if (opts.rotate?.[i - 1]) p.setRotation(degrees(opts.rotate[i - 1]));
  }
  return toFile(await pdf.save(), `${label}.pdf`);
};

export const makePng = (w = 200, h = 120, noisy = false): Buffer => {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#336699';
  ctx.fillRect(0, 0, w, h);
  if (noisy) {
    for (let i = 0; i < w * h * 0.5; i++) {
      ctx.fillStyle = `rgb(${(Math.random() * 255) | 0},${(Math.random() * 255) | 0},${(Math.random() * 255) | 0})`;
      ctx.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, 2, 2);
    }
  } else {
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(w / 4, h / 4, w / 2, h / 2);
  }
  return c.toBuffer('image/png');
};

export const makeJpeg = (w = 200, h = 120): Buffer => {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#aa3322';
  ctx.fillRect(0, 0, w, h);
  return c.toBuffer('image/jpeg');
};

export const pdfWithImage = async () => {
  const pdf = await PDFDocument.create();
  const img = await pdf.embedPng(new Uint8Array(makePng(300, 200, true)));
  const p = pdf.addPage([595, 842]);
  p.drawImage(img, { x: 50, y: 500, width: 300, height: 200 });
  return toFile(await pdf.save(), 'withimage.pdf');
};

/** Reads text back out with pdf.js so tests verify what a viewer would actually show. */
export const textOf = async (bytes: Uint8Array | File, password?: string): Promise<string> => {
  const { pdfjsLib } = await import('../src/utils/pdfjs');
  const data = bytes instanceof File ? new Uint8Array(await bytes.arrayBuffer()) : new Uint8Array(bytes);
  const doc = await pdfjsLib.getDocument({ data, password }).promise;
  let out = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map((it) => ('str' in it ? it.str : '')).join(' ') + '\n';
  }
  await doc.loadingTask.destroy();
  return out;
};

export const pageCount = async (bytes: Uint8Array) => (await PDFDocument.load(bytes)).getPageCount();
