import React from 'react';
import { ShieldCheck, FileText, Heart } from 'lucide-react';
import { TOOLS, CATEGORIES } from '../registry/tools';

interface FooterProps {
  onSelectTool: (slug: string) => void;
  onSelectCategory: (catId: string) => void;
  onNavigatePage: (page: string) => void;
}

const currentYear = new Date().getFullYear();

export const Footer: React.FC<FooterProps> = ({
  onSelectTool,
  onSelectCategory,
  onNavigatePage
}) => {
  const popularTools = TOOLS.filter((t) => t.popular).slice(0, 6);

  return (
    <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800 mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Privacy Statement */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigatePage('home')}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white">
                <FileText className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white font-heading">
                PDF<span className="gradient-text">Craft</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              The ultimate privacy-first PDF and document platform. All file manipulations, compression, merging, editing, and OCR run strictly in your web browser memory.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" /> 100% Private Client-Side Engine
            </div>
          </div>

          {/* Popular Tools */}
          <div>
            <h3 className="text-sm font-bold uppercase text-white tracking-wider mb-4 font-heading">
              Popular PDF Tools
            </h3>
            <ul className="space-y-2 text-xs">
              {popularTools.map((tool) => (
                <li key={tool.id}>
                  <button
                    onClick={() => onSelectTool(tool.slug)}
                    className="hover:text-indigo-400 transition-colors text-left"
                  >
                    {tool.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Tool Categories */}
          <div>
            <h3 className="text-sm font-bold uppercase text-white tracking-wider mb-4 font-heading">
              Categories
            </h3>
            <ul className="space-y-2 text-xs">
              {CATEGORIES.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => onSelectCategory(cat.id)}
                    className="hover:text-indigo-400 transition-colors text-left"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Open Source */}
          <div>
            <h3 className="text-sm font-bold uppercase text-white tracking-wider mb-4 font-heading">
              Legal & Licenses
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigatePage('about')} className="hover:text-indigo-400 transition-colors">
                  About PDFCraft
                </button>
              </li>
              <li>
                <button onClick={() => onNavigatePage('licenses')} className="hover:text-indigo-400 transition-colors flex items-center gap-1">
                  Open Source & Licenses
                </button>
              </li>
              <li>
                <button onClick={() => onNavigatePage('privacy')} className="hover:text-indigo-400 transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigatePage('terms')} className="hover:text-indigo-400 transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onNavigatePage('cookie-policy')} className="hover:text-indigo-400 transition-colors">
                  Cookie Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigatePage('disclaimer')} className="hover:text-indigo-400 transition-colors">
                  Disclaimer
                </button>
              </li>
              <li>
                <button onClick={() => onNavigatePage('contact')} className="hover:text-indigo-400 transition-colors">
                  Contact Support
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {currentYear} PDFCraft Platform. Built with web standard libraries (pdf-lib, pdfjs-dist, tesseract.js, jsPDF).</p>
          <p className="flex items-center gap-1">
            Engineered for speed & privacy <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500 inline" />
          </p>
        </div>
      </div>
    </footer>
  );
};
