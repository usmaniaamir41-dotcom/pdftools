import React, { useEffect, useRef } from 'react';

export const NetworkBackground: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lineRGB = (
      getComputedStyle(document.documentElement).getPropertyValue('--apk-line') || '129,140,248'
    ).trim();

    let w = 0;
    let h = 0;
    let dpr = 1;
    let nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
    let linkDist = 140;
    let mouseDist = 180;
    const pointer = { x: -9999, y: -9999, active: false };
    let rafId = 0;
    let running = false;
    let last = 0;

    function rand(a: number, b: number) {
      return a + Math.random() * (b - a);
    }

    function buildNodes() {
      const countCalc = Math.round((w * h) / 14000);
      const cap = w < 600 ? 55 : w < 1100 ? 100 : 160;
      const count = Math.max(30, Math.min(countCalc, cap));
      linkDist = Math.max(95, Math.min(170, w * 0.11));
      mouseDist = linkDist * 1.3;

      while (nodes.length > count) nodes.pop();
      while (nodes.length < count) {
        const a = rand(0, Math.PI * 2);
        const s = rand(0.12, 0.4);
        nodes.push({
          x: rand(0, w),
          y: rand(0, h),
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          r: rand(0.8, 2.2)
        });
      }
      nodes.forEach((n) => {
        if (n.x > w) n.x = rand(0, w);
        if (n.y > h) n.y = rand(0, h);
      });
    }

    function resize() {
      if (!canvas || !ctx) return;
      w = Math.max(1, window.innerWidth);
      h = Math.max(1, window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNodes();
      if (!running) draw();
    }

    function step(dt: number) {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < 0 || n.x > w) {
          n.vx *= -1;
          n.x = Math.max(0, Math.min(w, n.x));
        }
        if (n.y < 0 || n.y > h) {
          n.vy *= -1;
          n.y = Math.max(0, Math.min(h, n.y));
        }

        if (pointer.active) {
          const dx = pointer.x - n.x;
          const dy = pointer.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < mouseDist * mouseDist && d2 > 1) {
            const d = Math.sqrt(d2);
            const f = (1 - d / mouseDist) * 0.4 * dt;
            n.x += (dx / d) * f;
            n.y += (dy / d) * f;
          }
        }
      }
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      let i: number, j: number, a: typeof nodes[0], b: typeof nodes[0], dx: number, dy: number, d: number, alpha: number;

      ctx.lineWidth = 1;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j];
          dx = a.x - b.x;
          dy = a.y - b.y;
          if (dx > linkDist || dx < -linkDist || dy > linkDist || dy < -linkDist) continue;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkDist) {
            alpha = (1 - d / linkDist) * 0.32;
            ctx.strokeStyle = `rgba(${lineRGB},${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      if (pointer.active) {
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          dx = a.x - pointer.x;
          dy = a.y - pointer.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < mouseDist) {
            alpha = (1 - d / mouseDist) * 0.55;
            ctx.strokeStyle = `rgba(${lineRGB},${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = `rgba(${lineRGB},0.5)`;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop(t: number) {
      if (!running) return;
      const dt = Math.min(50, t - (last || t)) / 16.67;
      last = t;
      step(dt);
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduceMotion) return;
      running = true;
      last = 0;
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
    }

    function setPointer(e: PointerEvent) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    }

    function clearPointer() {
      pointer.active = false;
      pointer.x = pointer.y = -9999;
    }

    function handlePointerUp(e: PointerEvent) {
      if (e.pointerType !== 'mouse') clearPointer();
    }

    window.addEventListener('pointermove', setPointer, { passive: true });
    window.addEventListener('pointerdown', setPointer, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', clearPointer, { passive: true });
    document.documentElement.addEventListener('mouseleave', clearPointer);
    window.addEventListener('blur', clearPointer);

    function handleVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let resizeTimer: ReturnType<typeof setTimeout>;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    }
    window.addEventListener('resize', handleResize);

    resize();
    start();

    return () => {
      stop();
      window.removeEventListener('pointermove', setPointer);
      window.removeEventListener('pointerdown', setPointer);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', clearPointer);
      document.documentElement.removeEventListener('mouseleave', clearPointer);
      window.removeEventListener('blur', clearPointer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div ref={rootRef} className="apk-bg" data-apk-bg aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default NetworkBackground;
