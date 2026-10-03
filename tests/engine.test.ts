import { describe, it, expect } from 'vitest';
import { PDFDocument } from '@cantoo/pdf-lib';
import {
  mergePDFs, splitPDF, rotatePDF, deletePagesPDF, extractPagesPDF, addWatermarkPDF, addPageNumbersPDF,
  protectPDF, unlockPDF, updatePDFMetadata, getPDFMetadata, getPDFInfo, signPDF, editPDF, comparePDFs,
  imagesToPDF, compressPDF, extractImagesPDF, pdfToImages, extractTextPDF, textToPDF, markdownToPDF,
  friendlyError, typedSignatureToPng
} from '../src/utils/pdfEngine';
import { parsePageRanges } from '../src/utils/ranges';
import { makePdf, makePng, makeJpeg, pdfWithImage, textOf, pageCount, toFile } from './fixtures';

describe('page range parsing', () => {
  it('handles lists, open ranges, keywords and de-dupes', () => {
    expect(parsePageRanges('1-3, 5', 10)).toEqual([1, 2, 3, 5]);
    expect(parsePageRanges('8-', 10)).toEqual([8, 9, 10]);
    expect(parsePageRanges('-2', 10)).toEqual([1, 2]);
    expect(parsePageRanges('odd', 5)).toEqual([1, 3, 5]);
    expect(parsePageRanges('even', 5)).toEqual([2, 4]);
    expect(parsePageRanges('last', 7)).toEqual([7]);
    expect(parsePageRanges('2,2,1-2', 5)).toEqual([2, 1]);
  });
  it('rejects garbage and out-of-range pages with a clear message', () => {
    expect(() => parsePageRanges('abc', 5)).toThrow(/not a valid/);
    expect(() => parsePageRanges('9', 5)).toThrow(/outside the document/);
    expect(() => parsePageRanges('', 5)).toThrow(/at least one page/);
  });
});

describe('organize tools', () => {
  it('merge combines page counts in order', async () => {
    const out = await mergePDFs([await makePdf(3, 'A'), await makePdf(2, 'B')]);
    expect(await pageCount(out)).toBe(5);
    const txt = await textOf(out);
    expect(txt.indexOf('A page 1')).toBeLessThan(txt.indexOf('B page 1'));
  });

  it('merge refuses a single file', async () => {
    await expect(mergePDFs([await makePdf(1)])).rejects.toThrow(/at least two/);
  });

  it('split by range gives one file per segment', async () => {
    const res = await splitPDF(await makePdf(5), { mode: 'range', rangeStr: '1-2, 4' });
    expect(res).toHaveLength(2);
    expect(await pageCount(res[0].pdfBytes)).toBe(2);
    expect(await pageCount(res[1].pdfBytes)).toBe(1);
  });

  it('split every N', async () => {
    const res = await splitPDF(await makePdf(5), { mode: 'everyN', everyN: 2 });
    expect(res.map((r) => r.filename.split('_').pop())).toEqual(['part1.pdf', 'part2.pdf', 'part3.pdf']);
    expect(await pageCount(res[2].pdfBytes)).toBe(1);
  });

  it('rotate only the selected pages and accumulates', async () => {
    const out = await rotatePDF(await makePdf(4), 90, 'odd');
    const doc = await PDFDocument.load(out);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([90, 0, 90, 0]);
    const again = await rotatePDF(toFile(out, 'r.pdf'), -90, '1');
    expect((await PDFDocument.load(again)).getPage(0).getRotation().angle).toBe(0);
  });

  it('delete removes the chosen pages and refuses to delete everything', async () => {
    const out = await deletePagesPDF(await makePdf(5), '2-3');
    expect(await pageCount(out)).toBe(3);
    const txt = await textOf(out);
    expect(txt).toContain('Doc page 1');
    expect(txt).not.toContain('Doc page 2');
    await expect(deletePagesPDF(await makePdf(2), '1-2')).rejects.toThrow(/every page/);
  });

  it('extract keeps the requested order', async () => {
    const out = await extractPagesPDF(await makePdf(5), '5,1');
    const txt = await textOf(out);
    expect(await pageCount(out)).toBe(2);
    expect(txt.indexOf('page 5')).toBeLessThan(txt.indexOf('page 1'));
  });
});

describe('stamping tools', () => {
  it('watermark text appears on selected pages', async () => {
    const out = await addWatermarkPDF(await makePdf(3), 'SECRET', { pagesSpec: '1,3' });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
    expect((await textOf(out)).match(/SECRET/g)).toHaveLength(2);
  });

  it('watermark works on rotated pages', async () => {
    const out = await addWatermarkPDF(await makePdf(2, 'R', { rotate: [90, 270] }), 'DRAFT');
    expect((await textOf(out)).match(/DRAFT/g)).toHaveLength(2);
  });

  it('non-Latin watermark is drawn as an image instead of turning into "?????"', async () => {
    const out = await addWatermarkPDF(await makePdf(2), 'नमस्ते ಕನ್ನಡ');
    expect(await textOf(out)).not.toContain('?');
    const raw = Buffer.from(out).toString('latin1');
    expect(raw).toContain('/Subtype /Image');
    expect(friendlyError(new Error('WinAnsi cannot encode'))).toMatch(/Latin/);
  });

  it('empty watermark text is rejected', async () => {
    await expect(addWatermarkPDF(await makePdf(1), '   ')).rejects.toThrow(/Enter the watermark/);
  });

  it('page numbers use the format, start value and position', async () => {
    const out = await addPageNumbersPDF(await makePdf(3), { format: 'Pg {n}/{total}', startFrom: 5, position: 'top-right' });
    const txt = await textOf(out);
    expect(txt).toContain('Pg 5/7');
    expect(txt).toContain('Pg 7/7');
  });

  it('page numbers can skip the cover page', async () => {
    const out = await addPageNumbersPDF(await makePdf(3), { format: '{n}', skipFirst: true });
    expect(await textOf(out)).not.toMatch(/Doc page 1\s+1\b/);
  });
});

describe('security', () => {
  it('protect really encrypts and unlock really decrypts', async () => {
    const protectedBytes = await protectPDF(await makePdf(2), 'hunter2');
    expect(Buffer.from(protectedBytes).includes(Buffer.from('/Encrypt'))).toBe(true);
    // plain text must not be recoverable without the password
    await expect(textOf(protectedBytes)).rejects.toThrow();
    expect(await textOf(protectedBytes, 'hunter2')).toContain('Doc page 1');

    const file = toFile(protectedBytes, 'locked.pdf');
    await expect(mergePDFs([file, file])).rejects.toThrow(/password-protected/);

    const unlocked = await unlockPDF(file, 'hunter2');
    expect(Buffer.from(unlocked).includes(Buffer.from('/Encrypt'))).toBe(false);
    expect(await textOf(unlocked)).toContain('Doc page 2');
    expect(await pageCount(unlocked)).toBe(2);
  });

  it('unlock rejects a wrong password and unencrypted files', async () => {
    const locked = toFile(await protectPDF(await makePdf(1), 'right'), 'l.pdf');
    await expect(unlockPDF(locked, 'wrong')).rejects.toThrow(/Incorrect password/);
    await expect(unlockPDF(await makePdf(1), 'x')).rejects.toThrow(/not password-protected/);
    await expect(protectPDF(await makePdf(1), '')).rejects.toThrow(/Enter a password/);
  });
});

describe('metadata & info', () => {
  it('writes and reads metadata including keywords', async () => {
    const out = await updatePDFMetadata(await makePdf(1), {
      title: 'My Title', author: 'Aamir', subject: 'Sub', keywords: 'a, b ,c', creator: 'PDFCraft'
    });
    const meta = await getPDFMetadata(toFile(out, 'm.pdf'));
    expect(meta).toMatchObject({ title: 'My Title', author: 'Aamir', subject: 'Sub', creator: 'PDFCraft' });
    expect(meta.keywords).toContain('a');
  });

  it('info reports pages, paper and size', async () => {
    const info = await getPDFInfo(await makePdf(4));
    expect(info.pageCount).toBe(4);
    expect(info.paper).toBe('A4');
    expect(info.isEncrypted).toBe('No');
    const locked = await getPDFInfo(toFile(await protectPDF(await makePdf(1), 'p'), 'x.pdf'));
    expect(locked.isEncrypted).toBe('Yes');
  });
});

describe('sign & edit', () => {
  it('sign places a signature on the chosen page(s), also rotated ones', async () => {
    const sig = new Blob([new Uint8Array(makePng(300, 100))], { type: 'image/png' });
    const out = await signPDF(await makePdf(3, 'S', { rotate: [0, 90, 180] }), sig, {
      pages: 'all', xPct: 60, yPct: 80, widthPct: 25
    });
    expect(await pageCount(out)).toBe(3);
    expect(out.byteLength).toBeGreaterThan(1000);
    const one = await signPDF(await makePdf(3), sig, { pages: 2, xPct: 10, yPct: 10, widthPct: 20 });
    expect(await pageCount(one)).toBe(3);
  });

  it('typed signature renders to a PNG', async () => {
    const blob = await typedSignatureToPng('Aamir Usmani');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(Array.from(bytes.slice(1, 4))).toEqual([0x50, 0x4e, 0x47]);
  });

  it('edit applies text, whiteout, highlight, box and drawings', async () => {
    const out = await editPDF(await makePdf(2), [
      { type: 'text', page: 1, xPct: 10, yPct: 10, text: 'Hello Edited\nSecond line', size: 16, color: '#ff0000' },
      { type: 'whiteout', page: 1, xPct: 5, yPct: 5, wPct: 30, hPct: 5 },
      { type: 'highlight', page: 2, xPct: 5, yPct: 20, wPct: 30, hPct: 3 },
      { type: 'box', page: 2, xPct: 40, yPct: 40, wPct: 20, hPct: 10 },
      { type: 'draw', page: 2, color: '#0000ff', thickness: 2, points: [{ xPct: 10, yPct: 50 }, { xPct: 20, yPct: 55 }, { xPct: 30, yPct: 50 }] }
    ]);
    const txt = await textOf(out);
    expect(txt).toContain('Hello Edited');
    expect(txt).toContain('Second line');
    await expect(editPDF(await makePdf(1), [])).rejects.toThrow(/at least one edit/);
  });

  it('edit text in other scripts is placed as an image, not "?"', async () => {
    const out = await editPDF(await makePdf(1), [
      { type: 'text', page: 1, xPct: 10, yPct: 30, text: 'ನಮಸ್ಕಾರ', size: 18, color: '#000000' }
    ]);
    expect(await textOf(out)).not.toContain('?');
    expect(Buffer.from(out).toString('latin1')).toContain('/Subtype /Image');
  });
});

describe('conversion', () => {
  it('images -> pdf handles PNG and JPEG and page sizes', async () => {
    const imgs = [toFile(makePng(), 'a.png', 'image/png'), toFile(makeJpeg(), 'b.jpg', 'image/jpeg')];
    const fit = await imagesToPDF(imgs, { pageSize: 'fit', margin: 0 });
    expect(await pageCount(fit)).toBe(2);
    const a4 = await PDFDocument.load(await imagesToPDF(imgs, { pageSize: 'a4', orientation: 'portrait' }));
    expect(Math.round(a4.getPage(0).getWidth())).toBe(595);
    const land = await PDFDocument.load(await imagesToPDF(imgs, { pageSize: 'a4', orientation: 'landscape' }));
    expect(land.getPage(0).getWidth()).toBeGreaterThan(land.getPage(0).getHeight());
    await expect(imagesToPDF([])).rejects.toThrow();
  });

  it('pdf -> images renders every page', async () => {
    const res = await pdfToImages(await makePdf(3), 'png', 1);
    expect(res.map((r) => r.pageNum)).toEqual([1, 2, 3]);
    expect(res.every((r) => r.blob.size > 100)).toBe(true);
  });

  it('extract text returns page-labelled text and explains scanned PDFs', async () => {
    const txt = await extractTextPDF(await makePdf(2));
    expect(txt).toContain('--- Page 1 ---');
    expect(txt).toContain('Doc page 2');
    await expect(extractTextPDF(await pdfWithImage())).rejects.toThrow(/OCR/);
  });

  it('extract images pulls embedded images out as PNGs', async () => {
    const { count, blob } = await extractImagesPDF(await pdfWithImage());
    expect(count).toBe(1);
    expect(blob.size).toBeGreaterThan(500);
    await expect(extractImagesPDF(await makePdf(1))).rejects.toThrow(/No embedded images/);
  });
});

describe('compress', () => {
  it('never returns a larger file than the input', async () => {
    const src = await makePdf(3);
    for (const preset of ['low', 'medium', 'high'] as const) {
      const r = await compressPDF(src, preset);
      expect(r.newSize).toBeLessThanOrEqual(r.originalSize);
      expect(await pageCount(r.pdfBytes)).toBe(3);
    }
  });

  it('shrinks image-heavy PDFs', async () => {
    const pdf = await PDFDocument.create();
    const img = await pdf.embedPng(new Uint8Array(makePng(1400, 1800, true)));
    const p = pdf.addPage([595, 842]);
    p.drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    const file = toFile(await pdf.save(), 'scan.pdf');
    const r = await compressPDF(file, 'high');
    expect(r.method).toBe('rasterized');
    expect(r.newSize).toBeLessThan(r.originalSize * 0.8);
  });
});

describe('compare', () => {
  it('finds added and removed lines', async () => {
    const mk = async (lines: string[]) => {
      const pdf = await PDFDocument.create();
      const { StandardFonts } = await import('@cantoo/pdf-lib');
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const page = pdf.addPage([595, 842]);
      lines.forEach((l, i) => page.drawText(l, { x: 50, y: 780 - i * 20, size: 12, font }));
      return toFile(await pdf.save(), 'c.pdf');
    };
    const a = await mk(['Intro line', 'Price is 100', 'Closing line']);
    const b = await mk(['Intro line', 'Price is 120', 'Closing line', 'Extra clause']);
    const r = await comparePDFs(a, b);
    expect(r.removed).toBe(1);
    expect(r.added).toBe(2);
    expect(r.unchanged).toBe(2);
    expect(r.ops.find((o) => o.type === 'del')?.text).toBe('Price is 100');
    const same = await comparePDFs(a, a);
    expect(same.added + same.removed).toBe(0);
  });
});

describe('text & markdown to PDF', () => {
  it('long plain text paginates instead of running off the page', async () => {
    const text = Array.from({ length: 160 }, (_, i) => `Line number ${i + 1} of the document`).join('\n');
    const bytes = await textToPDF(text);
    expect(await pageCount(bytes)).toBeGreaterThan(2);
    const txt = await textOf(bytes);
    expect(txt).toContain('Line number 1 ');
    expect(txt).toContain('Line number 160');
  });

  it('markdown renders headings, lists, code and wraps long paragraphs', async () => {
    const md = `# Title\n\nSome **bold** text with a [link](https://x.dev).\n\n- one\n- two\n\n1. first\n\n> quote\n\n\`\`\`\ncode here\n\`\`\`\n\n${'word '.repeat(1500)}`;
    const bytes = await markdownToPDF(md);
    const txt = (await textOf(bytes)).replace(/\s+/g, ' ');
    expect(txt).toContain('Title');
    expect(txt).toContain('bold');
    expect(txt).not.toContain('**');
    expect(txt.replace(/ /g, '')).toContain('codehere');
    expect(await pageCount(bytes)).toBeGreaterThanOrEqual(2);
  });

  it('non-Latin scripts fall back to rendered pages instead of garbage', async () => {
    const bytes = await textToPDF('नमस्ते दुनिया\nಕನ್ನಡ');
    expect(await pageCount(bytes)).toBe(1);
  });

  it('rejects empty input', async () => {
    await expect(textToPDF('  ')).rejects.toThrow();
    await expect(markdownToPDF('')).rejects.toThrow();
  });
});
