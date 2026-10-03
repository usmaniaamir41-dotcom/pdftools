/** Single place that creates canvases so the engine can also run under tests. */
export const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
};

export const canvasToBlob = (canvas: HTMLCanvasElement, mime = 'image/png', quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    // Some environments (and napi-canvas in tests) only offer toBuffer / toDataURL.
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image.'))), mime, quality);
      return;
    }
    try {
      const url = canvas.toDataURL(mime, quality);
      const bin = atob(url.split(',')[1]);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      resolve(new Blob([bytes], { type: mime }));
    } catch (e) {
      reject(e);
    }
  });
