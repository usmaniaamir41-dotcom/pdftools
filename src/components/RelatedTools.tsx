import React from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { TOOLS } from '../registry/tools';
import type { PDFTool } from '../registry/tools';

interface RelatedToolsProps {
  currentToolId: string;
  onSelectTool: (slug: string) => void;
}

export const RelatedTools: React.FC<RelatedToolsProps> = ({
  currentToolId,
  onSelectTool
}) => {
  const currentTool = TOOLS.find((t) => t.id === currentToolId || t.slug === currentToolId);
  if (!currentTool) return null;

  // Filter out duplicates cleanly
  const relatedMap = new Map<string, PDFTool>();
  TOOLS.forEach((t) => {
    if (currentTool.relatedToolIds.includes(t.id) && t.id !== currentTool.id) {
      relatedMap.set(t.id, t);
    }
  });

  if (relatedMap.size < 4) {
    TOOLS.forEach((t) => {
      if (t.category === currentTool.category && t.id !== currentTool.id && relatedMap.size < 4) {
        relatedMap.set(t.id, t);
      }
    });
  }

  const related = Array.from(relatedMap.values()).slice(0, 4);

  return (
    <section className="mt-16 w-full max-w-5xl mx-auto border-t border-slate-200 dark:border-slate-800 pt-12">
      <div className="flex items-center gap-2 mb-6">
        <Layers className="w-5 h-5 text-indigo-500" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
          Related PDF Tools
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {related.map((tool: PDFTool, index: number) => (
          <div
            key={`${tool.id}-${index}`}
            onClick={() => onSelectTool(tool.slug)}
            className="tool-card group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {tool.categoryName}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </div>

            <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1 font-heading group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {tool.name}
            </h4>

            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {tool.shortDescription}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
