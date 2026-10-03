import React, { useState, useEffect, useRef } from 'react';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { searchTools } from '../registry/tools';
import type { PDFTool } from '../registry/tools';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (slug: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTool
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTools = searchTools(query);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredTools.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredTools.length) % Math.max(1, filteredTools.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTools[selectedIndex]) {
        onSelectTool(filteredTools[selectedIndex].slug);
        handleClose();
      }
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onKeyDown={handleKeyDown}
      >
        <div className="relative p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search PDF tool (e.g. Merge, Compress, OCR, Rotate, Protect)..."
            className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 text-base focus:outline-none font-sans"
          />
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-2 flex-1 space-y-1">
          {filteredTools.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              No PDF tool found matching "<span className="font-semibold">{query}</span>"
            </div>
          ) : (
            filteredTools.map((tool: PDFTool, index: number) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={tool.id}
                  onClick={() => {
                    onSelectTool(tool.slug);
                    handleClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold text-xs">
                      {tool.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm font-heading">
                          {tool.name}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {tool.categoryName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {tool.shortDescription}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
                      <span>Open</span>
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Use <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">↑</kbd>{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">↓</kbd> to navigate
          </span>
          <span>
            Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
