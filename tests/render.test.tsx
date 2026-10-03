import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { TOOLS, getToolBySlug } from '../src/registry/tools';
import { ToolWorkstation } from '../src/components/ToolWorkstation';
import { RelatedTools } from '../src/components/RelatedTools';
import { HomePage } from '../src/pages/HomePage';
import { SearchModal } from '../src/components/SearchModal';
import { Header } from '../src/components/Header';
import { Footer } from '../src/components/Footer';

describe('every tool page renders', () => {
  for (const tool of TOOLS) {
    it(`${tool.id}`, () => {
      const html = renderToString(<ToolWorkstation tool={tool} />);
      expect(html).toContain(tool.seo.h1.replace(/&/g, '&amp;'));
      // every tool must have something to act on: a dropzone or a text editor
      expect(html.includes('Select') || html.includes('textarea')).toBe(true);
    });
  }
});

describe('registry integrity', () => {
  it('all related tool ids exist and slugs resolve', () => {
    const ids = new Set(TOOLS.map((t) => t.id));
    for (const t of TOOLS) {
      for (const r of t.relatedToolIds) expect(ids.has(r), `${t.id} -> ${r}`).toBe(true);
      expect(getToolBySlug(t.slug)?.id).toBe(t.id);
    }
    expect(new Set(TOOLS.map((t) => t.slug)).size).toBe(TOOLS.length);
  });

  it('every tool id has a handler in the workstation', async () => {
    const src = (await import('node:fs')).readFileSync('src/components/ToolWorkstation.tsx', 'utf8');
    for (const t of TOOLS) expect(src.includes(`'${t.id}'`), t.id).toBe(true);
  });
});

describe('shell components render', () => {
  it('home, header, footer, search, related', () => {
    (globalThis as unknown as { window: unknown }).window = { location: { href: 'http://localhost/' } };
    expect(renderToString(<HomePage onSelectTool={() => {}} onOpenSearch={() => {}} activeCategory="all" onSelectCategory={() => {}} />)).toContain('PDF Tools');
    expect(renderToString(<Header onOpenSearch={() => {}} onSelectCategory={() => {}} onNavigateHome={() => {}} darkMode={false} setDarkMode={() => {}} />)).toContain('PDF');
    expect(renderToString(<Footer onSelectTool={() => {}} onSelectCategory={() => {}} onNavigatePage={() => {}} />)).toContain('PDFCraft');
    expect(renderToString(<SearchModal isOpen onClose={() => {}} onSelectTool={() => {}} />)).toContain('Search');
    expect(renderToString(<RelatedTools currentToolId="merge-pdf" onSelectTool={() => {}} />)).toContain('Related');
  });
});
