import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SearchModal } from './components/SearchModal';
import { HomePage } from './pages/HomePage';
import { ToolWorkstation } from './components/ToolWorkstation';
import { RelatedTools } from './components/RelatedTools';
import { LegalPage } from './pages/LegalPage';
import { getToolBySlug } from './registry/tools';

export function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('pdfcraft_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [activeSlug, setActiveSlug] = useState<string>('home');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('pdfcraft_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('pdfcraft_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\//, '');
      if (!path) {
        setActiveSlug('home');
      } else {
        setActiveSlug(path);
      }
    };

    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (slug: string) => {
    setActiveSlug(slug);
    window.history.pushState({}, '', slug === 'home' ? '/' : `/${slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectedTool = getToolBySlug(activeSlug);
  const isLegalPage = ['about', 'privacy', 'terms', 'cookie-policy', 'disclaimer', 'licenses', 'contact'].includes(
    activeSlug
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-250">
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        activeCategory={activeCategory}
        onSelectCategory={(catId) => {
          setActiveCategory(catId);
          navigateTo('home');
        }}
        onNavigateHome={() => navigateTo('home')}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {selectedTool ? (
          <div className="space-y-8 sm:space-y-12">
            <ToolWorkstation tool={selectedTool} />
            <RelatedTools currentToolId={selectedTool.id} onSelectTool={(slug) => navigateTo(slug)} />
          </div>
        ) : isLegalPage ? (
          <LegalPage type={activeSlug as any} onNavigateHome={() => navigateTo('home')} />
        ) : (
          <HomePage
            onSelectTool={(slug) => navigateTo(slug)}
            onOpenSearch={() => setIsSearchOpen(true)}
            activeCategory={activeCategory}
            onSelectCategory={(catId) => setActiveCategory(catId)}
          />
        )}
      </main>

      <Footer
        onSelectTool={(slug) => navigateTo(slug)}
        onSelectCategory={(catId) => {
          setActiveCategory(catId);
          navigateTo('home');
        }}
        onNavigatePage={(page) => navigateTo(page)}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTool={(slug) => navigateTo(slug)}
      />
    </div>
  );
}

export default App;
