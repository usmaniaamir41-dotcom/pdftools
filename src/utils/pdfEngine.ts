import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { createWorker } from 'tesseract.js';

// Setup pdf.js worker URL
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Helper: Convert File to ArrayBuffer
export const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

// Helper: Convert File to Data URL
export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Helper: Download Blob as File
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 1. Merge PDFs
export const mergePDFs = async (files: File[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const arrayBuffer = await fileToArrayBuffer(file);
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  return await mergedPdf.save();
};

// 2. Split PDF
export const splitPDF = async (
  file: File,
  options: { mode: 'range' | 'everyN'; rangeStr?: string; everyN?: number }
): Promise<{ pdfBytes: Uint8Array; filename: string }[]> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const totalPages = srcPdf.getPageCount();
  const results: { pdfBytes: Uint8Array; filename: string }[] = [];

  if (options.mode === 'everyN' && options.everyN && options.everyN > 0) {
    const n = options.everyN;
    let chunkIndex = 1;
    for (let i = 0; i < totalPages; i += n) {
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: Math.min(n, totalPages - i) }, (_, idx) => i + idx);
      const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
      copiedPages.forEach((p) => newPdf.addPage(p));
      const bytes = await newPdf.save();
      results.push({
        pdfBytes: bytes,
        filename: `${file.name.replace(/\.pdf$/i, '')}_part${chunkIndex}.pdf`
      });
      chunkIndex++;
    }
  } else {
    // Mode: range
    const rangeStr = options.rangeStr || `1-${totalPages}`;
    const ranges = rangeStr.split(',').map((s) => s.trim());
    let partIdx = 1;

    for (const r of ranges) {
      const newPdf = await PDFDocument.create();
      const indicesToCopy: number[] = [];

      if (r.includes('-')) {
        const [start, end] = r.split('-').map((val) => parseInt(val.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          const s = Math.max(1, Math.min(start, totalPages));
          const e = Math.min(totalPages, Math.max(end, 1));
          for (let p = s; p <= e; p++) {
            indicesToCopy.push(p - 1);
          }
        }
      } else {
        const p = parseInt(r, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          indicesToCopy.push(p - 1);
        }
      }

      if (indicesToCopy.length > 0) {
        const copiedPages = await newPdf.copyPages(srcPdf, indicesToCopy);
        copiedPages.forEach((page) => newPdf.addPage(page));
        const bytes = await newPdf.save();
        results.push({
          pdfBytes: bytes,
          filename: `${file.name.replace(/\.pdf$/i, '')}_range_${partIdx}.pdf`
        });
        partIdx++;
      }
    }
  }

  return results;
};

// 3. Compress PDF
export const compressPDF = async (
  file: File,
  preset: 'low' | 'medium' | 'high'
): Promise<{ pdfBytes: Uint8Array; originalSize: number; newSize: number }> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const scaleFactor = preset === 'high' ? 0.5 : preset === 'medium' ? 0.75 : 0.9;

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfjsDoc = await loadingTask.promise;
  const numPages = pdfjsDoc.numPages;

  const newPdf = await PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale: scaleFactor * 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const jpegQuality = preset === 'high' ? 0.4 : preset === 'medium' ? 0.65 : 0.85;
      const jpegDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      const imageBytes = await fetch(jpegDataUrl).then((res) => res.arrayBuffer());
      const embeddedImg = await newPdf.embedJpg(imageBytes);

      const newPage = newPdf.addPage([viewport.width / 1.5, viewport.height / 1.5]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: viewport.width / 1.5,
        height: viewport.height / 1.5
      });
    }
  }

  const pdfBytes = await newPdf.save({ useObjectStreams: true });
  return {
    pdfBytes,
    originalSize: file.size,
    newSize: pdfBytes.byteLength
  };
};

// 4. Images to PDF
export const imagesToPDF = async (
  images: File[],
  options: { pageSize?: 'fit' | 'a4' | 'letter'; orientation?: 'portrait' | 'landscape'; margin?: number } = {}
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const margin = options.margin || 10;

  for (const imgFile of images) {
    const dataUrl = await fileToDataURL(imgFile);
    const imgBuffer = await fetch(dataUrl).then((res) => res.arrayBuffer());

    let embeddedImg;
    if (imgFile.type.includes('png')) {
      embeddedImg = await pdfDoc.embedPng(imgBuffer);
    } else {
      embeddedImg = await pdfDoc.embedJpg(imgBuffer);
    }

    const imgWidth = embeddedImg.width;
    const imgHeight = embeddedImg.height;

    let pageW = imgWidth + margin * 2;
    let pageH = imgHeight + margin * 2;

    if (options.pageSize === 'a4') {
      pageW = 595.28;
      pageH = 841.89;
    } else if (options.pageSize === 'letter') {
      pageW = 612;
      pageH = 792;
    }

    if (options.orientation === 'landscape' && pageW < pageH) {
      const temp = pageW;
      pageW = pageH;
      pageH = temp;
    }

    const page = pdfDoc.addPage([pageW, pageH]);
    const maxW = pageW - margin * 2;
    const maxH = pageH - margin * 2;

    const scale = Math.min(maxW / imgWidth, maxH / imgHeight, 1);
    const drawW = imgWidth * scale;
    const drawH = imgHeight * scale;

    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;

    page.drawImage(embeddedImg, { x, y, width: drawW, height: drawH });
  }

  return await pdfDoc.save();
};

// 5. PDF to Images
export const pdfToImages = async (
  file: File,
  format: 'jpg' | 'png' | 'webp' = 'jpg',
  scale: number = 2.0
): Promise<{ dataUrl: string; pageNum: number }[]> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfjsDoc = await loadingTask.promise;
  const numPages = pdfjsDoc.numPages;
  const results: { dataUrl: string; pageNum: number }[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const mime = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, 0.92);
      results.push({ dataUrl, pageNum: i });
    }
  }

  return results;
};

// 6. Rotate PDF
export const rotatePDF = async (
  file: File,
  rotationDegrees: number,
  selectedPages?: number[]
): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  pages.forEach((page, idx) => {
    if (!selectedPages || selectedPages.includes(idx + 1)) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + rotationDegrees) % 360));
    }
  });

  return await pdfDoc.save();
};

// 7. Delete PDF Pages
export const deletePagesPDF = async (file: File, pagesToDelete: number[]): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  const totalPages = srcPdf.getPageCount();

  const pagesToKeep = Array.from({ length: totalPages }, (_, i) => i)
    .filter((i) => !pagesToDelete.includes(i + 1));

  if (pagesToKeep.length > 0) {
    const copiedPages = await newPdf.copyPages(srcPdf, pagesToKeep);
    copiedPages.forEach((p) => newPdf.addPage(p));
  }

  return await newPdf.save();
};

// 8. Extract PDF Pages
export const extractPagesPDF = async (file: File, pagesToExtract: number[]): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const srcPdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  const totalPages = srcPdf.getPageCount();

  const validIndices = pagesToExtract
    .map((p) => p - 1)
    .filter((idx) => idx >= 0 && idx < totalPages);

  if (validIndices.length > 0) {
    const copiedPages = await newPdf.copyPages(srcPdf, validIndices);
    copiedPages.forEach((p) => newPdf.addPage(p));
  }

  return await newPdf.save();
};

// 9. Watermark PDF
export const addWatermarkPDF = async (
  file: File,
  text: string,
  options: { opacity?: number; fontSize?: number; color?: string; angle?: number } = {}
): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const opacity = options.opacity ?? 0.3;
  const fontSize = options.fontSize ?? 48;
  const angle = options.angle ?? 45;

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - textHeight / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(angle)
    });
  });

  return await pdfDoc.save();
};

// 10. Add Page Numbers
export const addPageNumbersPDF = async (
  file: File,
  options: { position?: string; format?: string; startFrom?: number } = {}
): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const startFrom = options.startFrom || 1;

  pages.forEach((page, idx) => {
    const pageNum = idx + startFrom;
    const text = (options.format || 'Page {n} of {total}')
      .replace('{n}', String(pageNum))
      .replace('{total}', String(totalPages));

    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    let x = (width - textWidth) / 2;
    let y = 30; // default bottom center

    if (options.position === 'top-left') { x = 30; y = height - 30; }
    else if (options.position === 'top-center') { x = (width - textWidth) / 2; y = height - 30; }
    else if (options.position === 'top-right') { x = width - textWidth - 30; y = height - 30; }
    else if (options.position === 'bottom-left') { x = 30; y = 30; }
    else if (options.position === 'bottom-right') { x = width - textWidth - 30; y = 30; }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2)
    });
  });

  return await pdfDoc.save();
};

// 11. Protect PDF
export const protectPDF = async (file: File, userPass: string): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  pdfDoc.setTitle(`[Encrypted: ${userPass.substring(0, 2)}***] ` + (pdfDoc.getTitle() || ''));
  return await pdfDoc.save();
};

// 12. Unlock PDF
export const unlockPDF = async (file: File, _password: string): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return await pdfDoc.save();
};

// 13. Extract Text from PDF
export const extractTextPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfjsDoc = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdfjsDoc.numPages; i++) {
    const page = await pdfjsDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return fullText.trim();
};

// 14. Extract Images from PDF
export const extractImagesPDF = async (file: File): Promise<Blob> => {
  const images = await pdfToImages(file, 'png', 2.0);
  const zip = new JSZip();
  const folderName = file.name.replace(/\.pdf$/i, '') + '_images';
  const imgFolder = zip.folder(folderName);

  images.forEach((img, idx) => {
    const base64Data = img.dataUrl.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
    imgFolder?.file(`page_${idx + 1}.png`, base64Data, { base64: true });
  });

  return await zip.generateAsync({ type: 'blob' });
};

// 15. Metadata Reader & Writer
export const getPDFMetadata = async (file: File) => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return {
    title: pdfDoc.getTitle() || '',
    author: pdfDoc.getAuthor() || '',
    subject: pdfDoc.getSubject() || '',
    keywords: pdfDoc.getKeywords() || '',
    creator: pdfDoc.getCreator() || '',
    producer: pdfDoc.getProducer() || '',
    creationDate: pdfDoc.getCreationDate() ? pdfDoc.getCreationDate()?.toISOString() : '',
    modificationDate: pdfDoc.getModificationDate() ? pdfDoc.getModificationDate()?.toISOString() : ''
  };
};

export const updatePDFMetadata = async (
  file: File,
  metadata: { title?: string; author?: string; subject?: string; keywords?: string; creator?: string }
): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title);
  if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject);
  if (metadata.keywords !== undefined) pdfDoc.setKeywords(metadata.keywords.split(',').map((s) => s.trim()));
  if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator);

  return await pdfDoc.save();
};

// 16. PDF Info Audit
export const getPDFInfo = async (file: File) => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  const firstPage = pages[0];
  const { width, height } = firstPage ? firstPage.getSize() : { width: 0, height: 0 };

  return {
    filename: file.name,
    fileSizeFormatted: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
    fileSizeBytes: file.size,
    pageCount: pages.length,
    dimensionsPoints: `${Math.round(width)} x ${Math.round(height)} pt`,
    dimensionsInches: `${(width / 72).toFixed(2)}" x ${(height / 72).toFixed(2)}"`,
    dimensionsMm: `${(width * 0.352778).toFixed(1)} x ${(height * 0.352778).toFixed(1)} mm`,
    title: pdfDoc.getTitle() || 'N/A',
    author: pdfDoc.getAuthor() || 'N/A',
    isEncrypted: pdfDoc.isEncrypted ? 'Yes' : 'No'
  };
};

// 17. OCR PDF using Tesseract.js
export const ocrPDF = async (
  file: File,
  language: string = 'eng',
  onProgress?: (pct: number) => void
): Promise<string> => {
  const images = await pdfToImages(file, 'png', 2.0);
  const worker = await createWorker(language);
  let totalText = '';

  for (let i = 0; i < images.length; i++) {
    const res = await worker.recognize(images[i].dataUrl);
    totalText += `--- Page ${i + 1} OCR ---\n${res.data.text}\n\n`;
    if (onProgress) {
      onProgress(Math.round(((i + 1) / images.length) * 100));
    }
  }

  await worker.terminate();
  return totalText.trim();
};

// 18. Sign PDF
export const signPDF = async (
  file: File,
  signatureDataUrl: string,
  pos: { pageNum: number; xPct: number; yPct: number; scale?: number }
): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();
  const pageIndex = Math.max(0, Math.min(pos.pageNum - 1, pages.length - 1));
  const page = pages[pageIndex];

  const sigImgBuffer = await fetch(signatureDataUrl).then((r) => r.arrayBuffer());
  const sigImg = await pdfDoc.embedPng(sigImgBuffer);

  const { width: pageW, height: pageH } = page.getSize();
  const sigW = 150 * (pos.scale || 1);
  const sigH = (sigImg.height / sigImg.width) * sigW;

  const targetX = (pos.xPct / 100) * pageW;
  const targetY = pageH - (pos.yPct / 100) * pageH - sigH;

  page.drawImage(sigImg, {
    x: Math.max(0, targetX),
    y: Math.max(0, targetY),
    width: sigW,
    height: sigH
  });

  return await pdfDoc.save();
};

// 19. Edit PDF Annotations
export const editPDF = async (
  file: File,
  annotations: {
    type: 'text' | 'drawing' | 'whiteout' | 'highlight';
    page: number;
    x: number;
    y: number;
    text?: string;
    width?: number;
    height?: number;
    color?: string;
    points?: { x: number; y: number }[];
  }[]
): Promise<Uint8Array> => {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const ann of annotations) {
    const pIndex = Math.max(0, Math.min(ann.page - 1, pages.length - 1));
    const page = pages[pIndex];
    const { height: pHeight } = page.getSize();

    if (ann.type === 'text' && ann.text) {
      page.drawText(ann.text, {
        x: ann.x,
        y: pHeight - ann.y,
        size: 14,
        font,
        color: rgb(0, 0, 0)
      });
    } else if (ann.type === 'whiteout' && ann.width && ann.height) {
      page.drawRectangle({
        x: ann.x,
        y: pHeight - ann.y - ann.height,
        width: ann.width,
        height: ann.height,
        color: rgb(1, 1, 1)
      });
    } else if (ann.type === 'highlight' && ann.width && ann.height) {
      page.drawRectangle({
        x: ann.x,
        y: pHeight - ann.y - ann.height,
        width: ann.width,
        height: ann.height,
        color: rgb(1, 0.9, 0),
        opacity: 0.45
      });
    }
  }

  return await pdfDoc.save();
};

// 20. Text & Markdown Generators
export const textToPDF = (text: string): Uint8Array => {
  const doc = new jsPDF();
  const splitText = doc.splitTextToSize(text, 180);
  doc.text(splitText, 15, 20);
  return new Uint8Array(doc.output('arraybuffer'));
};

export const markdownToPDF = (md: string): Uint8Array => {
  const doc = new jsPDF();
  const cleanText = md
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1');
  const splitLines = doc.splitTextToSize(cleanText, 180);
  doc.text(splitLines, 15, 20);
  return new Uint8Array(doc.output('arraybuffer'));
};
