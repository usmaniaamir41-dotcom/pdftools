// Use pdf.js's *legacy* build. The modern build calls Promise.try, which only exists in very recent
// browsers (Chrome 128+, Safari 18.2+, Firefox 134+). On anything older -- including many phones --
// the worker crashes and every pdf.js-based tool (compress, PDF->image, text, OCR...) silently fails.
// The legacy build ships the needed polyfills.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// Bundle the worker with the app instead of fetching it from a CDN
// (the old CDN URL broke these tools when offline / blocked / on a version mismatch).
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
}

export { pdfjsLib };
