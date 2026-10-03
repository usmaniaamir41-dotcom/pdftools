import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { renderPdfPage } from '../utils/pdfEngine';

export interface PageInfo {
  numPages: number;
  widthPt: number;
  heightPt: number;
}

interface Props {
  file: File;
  page: number;
  onPageChange: (p: number) => void;
  mode: 'point' | 'rect' | 'path';
  onPoint?: (xPct: number, yPct: number) => void;
  onRect?: (xPct: number, yPct: number, wPct: number, hPct: number) => void;
  onPath?: (points: { xPct: number; yPct: number }[]) => void;
  /** Rendered inside the page, positioned in percentages. */
  overlay?: (info: PageInfo) => React.ReactNode;
  hint?: string;
}

/** Shows one page of a PDF and turns clicks / drags into page-relative percentages. */
export const PagePicker: React.FC<Props> = ({ file, page, onPageChange, mode, onPoint, onRect, onPath, overlay, hint }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<PageInfo | null>(null);
  const [loadedKey, setLoadedKey] = useState('');
  const [failed, setFailed] = useState('');
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [path, setPath] = useState<{ xPct: number; yPct: number }[]>([]);

  const key = `${file.name}:${file.size}:${file.lastModified}:${page}`;

  useEffect(() => {
    let cancelled = false;
    renderPdfPage(file, page, 720)
      .then((r) => {
        if (cancelled || !canvasRef.current) return;
        const c = canvasRef.current;
        c.width = r.canvas.width;
        c.height = r.canvas.height;
        c.getContext('2d')!.drawImage(r.canvas, 0, 0);
        setInfo({ numPages: r.numPages, widthPt: r.widthPt, heightPt: r.heightPt });
        setFailed('');
        setLoadedKey(key);
      })
      .catch((e: Error) => {
        if (!cancelled) setFailed(e.message || 'Could not preview this PDF.');
      });
    return () => {
      cancelled = true;
    };
  }, [file, page, key]);

  const loading = loadedKey !== key && !failed;

  const pct = (e: React.PointerEvent) => {
    const r = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100))
    };
  };

  const down = (e: React.PointerEvent) => {
    if (loading) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = pct(e);
    if (mode === 'point') onPoint?.(p.x, p.y);
    else if (mode === 'rect') setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    else setPath([{ xPct: p.x, yPct: p.y }]);
  };
  const move = (e: React.PointerEvent) => {
    if (mode === 'rect' && drag) {
      const p = pct(e);
      setDrag({ ...drag, x1: p.x, y1: p.y });
    } else if (mode === 'path' && path.length) {
      const p = pct(e);
      setPath((prev) => [...prev, { xPct: p.x, yPct: p.y }]);
    }
  };
  const up = () => {
    if (mode === 'rect' && drag) {
      const x = Math.min(drag.x0, drag.x1);
      const y = Math.min(drag.y0, drag.y1);
      const w = Math.abs(drag.x1 - drag.x0);
      const h = Math.abs(drag.y1 - drag.y0);
      if (w > 0.8 && h > 0.5) onRect?.(x, y, w, h);
      setDrag(null);
    } else if (mode === 'path' && path.length) {
      if (path.length > 1) onPath?.(path);
      setPath([]);
    }
  };

  const total = info?.numPages ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-secondary !p-2"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">
            Page {page} / {total}
          </span>
          <button
            type="button"
            className="btn-secondary !p-2"
            disabled={page >= total}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {hint && <span className="text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-3 sm:p-4 flex justify-center overflow-auto">
        <div className="relative w-full max-w-[560px] shadow-xl rounded-sm bg-white select-none">
          <div ref={stageRef} className="page-stage relative w-full">
            <canvas ref={canvasRef} className={`block w-full h-auto transition-opacity duration-300 ${loading ? 'opacity-40' : 'opacity-100'}`} />
            {info && (
              <div
                className="absolute inset-0 cursor-crosshair"
                style={{ touchAction: mode === 'point' ? 'manipulation' : 'none' }}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
              >
                {overlay?.(info)}
                {drag && (
                  <div
                    className="absolute border-2 border-indigo-500 bg-indigo-500/15 rounded-[2px]"
                    style={{
                      left: `${Math.min(drag.x0, drag.x1)}%`,
                      top: `${Math.min(drag.y0, drag.y1)}%`,
                      width: `${Math.abs(drag.x1 - drag.x0)}%`,
                      height: `${Math.abs(drag.y1 - drag.y0)}%`
                    }}
                  />
                )}
                {path.length > 1 && (
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <polyline
                      points={path.map((p) => `${p.xPct},${p.yPct}`).join(' ')}
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="0.6"
                      vectorEffect="non-scaling-stroke"
                      style={{ strokeWidth: 2 }}
                    />
                  </svg>
                )}
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            )}
            {failed && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600">{failed}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
