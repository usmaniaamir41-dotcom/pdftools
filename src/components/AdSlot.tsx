import React from 'react';

interface AdSlotProps {
  type: 'top-banner' | 'sidebar' | 'in-content' | 'result-area' | 'footer-banner';
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ type, className = '' }) => {
  let styleClasses = '';
  let adDimensions = '';

  switch (type) {
    case 'top-banner':
      styleClasses = 'w-full max-w-5xl h-24 my-6 mx-auto';
      adDimensions = '728 x 90 Leaderboard / 970 x 90 BillBoard';
      break;
    case 'sidebar':
      styleClasses = 'w-full h-80 my-4';
      adDimensions = '300 x 250 Medium Rectangle / 300 x 600 Half Page';
      break;
    case 'in-content':
      styleClasses = 'w-full max-w-3xl h-32 my-8 mx-auto';
      adDimensions = ' Responsive In-Article Ad Unit ';
      break;
    case 'result-area':
      styleClasses = 'w-full max-w-3xl h-28 my-6 mx-auto';
      adDimensions = ' Native Result Banner (Google AdSense Ready) ';
      break;
    case 'footer-banner':
      styleClasses = 'w-full max-w-4xl h-24 my-8 mx-auto';
      adDimensions = '728 x 90 Footer Banner';
      break;
  }

  return (
    <div
      className={`relative rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 flex flex-col items-center justify-center p-3 text-center transition-all ${styleClasses} ${className}`}
      aria-label="Advertisement Placeholder"
    >
      <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 mb-1">
        ADVERTISEMENT
      </span>
      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
        {adDimensions}
      </span>
      <span className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">
        AdSense & Ad Exchange Ready Slot
      </span>
    </div>
  );
};
