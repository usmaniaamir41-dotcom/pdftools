import React, { useEffect, useRef } from 'react';

export interface HeroNetworkProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  onButtonClick?: () => void;
  className?: string;
}

export const HeroNetwork: React.FC<HeroNetworkProps> = ({
  title = 'All Your PDF Tools in One Place',
  subtitle = 'Compress, merge, split, convert, edit, sign, and manage PDF documents online with 100% privacy & zero server uploads.',
  buttonText = 'Explore Tools',
  buttonLink = '#tools-section',
  onButtonClick,
  className = ''
}) => {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    if (!hero || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lineRGB = (getComputedStyle(hero).getPropertyValue('--apk-line') || '255,255,255').trim();

    let w = 0;
    let h = 0;
    let dpr = 1;
    let nodes: Array<{ x: number; y: number; vx: number; vy: number; r: number }> = [];
    let linkDist = 140;
    let mouseDist = 170;
    const mouse = { x: -9999, y: -9999, active: false };
    let rafId = 0;
    let running = false;
    let last = 0;

    function rand(a: number, b: number) {
      return a + Math.random() * (b - a);
    }

    function buildNodes() {
      const count = Math.max(24, Math.min(Math.round((w * h) / 15000), w < 600 ? 45 : 110));
      linkDist = Math.max(90, Math.min(170, w * 0.11));
      mouseDist = linkDist * 1.25;

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

      if (mouse.active) {
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          dx = a.x - mouse.x;
          dy = a.y - mouse.y;
          d = Math.sqrt(dx * dx + dy * dy);
          if (d < mouseDist) {
            alpha = (1 - d / mouseDist) * 0.55;
            ctx.strokeStyle = `rgba(${lineRGB},${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
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

    function resize() {
      if (!hero || !canvas || !ctx) return;
      const rect = hero.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
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

        if (mouse.active) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < mouseDist * mouseDist && d2 > 1) {
            const d = Math.sqrt(d2);
            const f = (1 - d / mouseDist) * 0.02 * dt;
            n.x += (dx / d) * f * 20;
            n.y += (dy / d) * f * 20;
          }
        }
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
      const r = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.active = true;
    }

    function clearPointer() {
      mouse.active = false;
      mouse.x = mouse.y = -9999;
    }

    function handlePointerUp(e: PointerEvent) {
      if (e.pointerType !== 'mouse') clearPointer();
    }

    hero.addEventListener('pointermove', setPointer, { passive: true });
    hero.addEventListener('pointerdown', setPointer, { passive: true });
    hero.addEventListener('pointerleave', clearPointer);
    hero.addEventListener('pointercancel', clearPointer);
    hero.addEventListener('pointerup', handlePointerUp);

    let observer: IntersectionObserver | null = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            start();
          } else {
            stop();
          }
        },
        { threshold: 0 }
      );
      observer.observe(hero);
    } else {
      start();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const hasResizeObserver = typeof ResizeObserver !== 'undefined';
    let resizeObserver: ResizeObserver | null = null;
    if (hasResizeObserver) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(hero);
    } else {
      window.addEventListener('resize', resize);
    }

    resize();

    return () => {
      stop();
      hero.removeEventListener('pointermove', setPointer);
      hero.removeEventListener('pointerdown', setPointer);
      hero.removeEventListener('pointerleave', clearPointer);
      hero.removeEventListener('pointercancel', clearPointer);
      hero.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (observer) observer.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      if (!hasResizeObserver) {
        window.removeEventListener('resize', resize);
      }
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className={`apk-hero ${className}`}
      data-apk-hero
      aria-labelledby="apk-hero-title"
    >
      <canvas ref={canvasRef} className="apk-hero__canvas" aria-hidden="true" />
      <div className="apk-hero__inner">
        <h1 className="apk-hero__title" id="apk-hero-title">
          {title}
        </h1>
        <p className="apk-hero__subtitle">{subtitle}</p>
        <a
          className="apk-hero__btn"
          href={buttonLink}
          onClick={(e) => {
            if (onButtonClick) {
              e.preventDefault();
              onButtonClick();
            }
          }}
        >
          {buttonText}
        </a>
      </div>
    </section>
  );
};

export default HeroNetwork;
