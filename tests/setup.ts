import { createCanvas } from '@napi-rs/canvas';

// The engine creates canvases via document.createElement('canvas'); provide one for Node.
(globalThis as unknown as { document: unknown }).document = {
  createElement: (tag: string) => {
    if (tag !== 'canvas') throw new Error(`unsupported element ${tag}`);
    return createCanvas(1, 1);
  }
};
