import React from 'react';
import { ShieldCheck, Code, Mail, ArrowLeft } from 'lucide-react';
import { MetaTags } from '../components/MetaTags';

interface LegalPageProps {
  type: 'about' | 'privacy' | 'terms' | 'cookie-policy' | 'disclaimer' | 'licenses' | 'contact';
  onNavigateHome: () => void;
}

export const LegalPage: React.FC<LegalPageProps> = ({ type, onNavigateHome }) => {
  if (type === 'licenses') {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in py-8 px-4">
        <MetaTags
          title="Open-Source Software & License Audit"
          description="Full license audit and attribution for open-source libraries integrated into PDFCraft."
        />

        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Code className="w-3.5 h-3.5" /> Open Source Attribution
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading">
            Third-Party Open-Source Software Audit
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-3xl">
            PDFCraft is built on top of world-class open-source software libraries. In accordance with open-source licensing compliance, this page documents all integrated repositories, their licenses, commercial permissions, and attributions.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-heading">
                <th className="p-4 font-bold">Repository / Library</th>
                <th className="p-4 font-bold">License</th>
                <th className="p-4 font-bold">Commercial Use</th>
                <th className="p-4 font-bold">Functionality Adapted / Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <td className="p-4 font-bold text-slate-900 dark:text-white">
                  <a href="https://github.com/aymenhmaidiwastaken/OpenPdf" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    OpenPdf
                  </a>
                </td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">MIT</span></td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Permitted</td>
                <td className="p-4">Reference architecture for web PDF tools & page manipulation workflows</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900 dark:text-white">
                  <a href="https://github.com/dannycranmer/parchment" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    Parchment
                  </a>
                </td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">MIT</span></td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Permitted</td>
                <td className="p-4">Browser PDF rendering and viewer layout reference</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900 dark:text-white">
                  <a href="https://github.com/cauberome/pdf-toolkit" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    PDF Toolkit
                  </a>
                </td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">MIT</span></td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Permitted</td>
                <td className="p-4">PDF extraction and document conversion workflow references</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900 dark:text-white">
                  <a href="https://github.com/KibouAkari/S-PDF" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    S-PDF
                  </a>
                </td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">Apache-2.0</span></td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Permitted</td>
                <td className="p-4">Client-side security and watermark placement logic patterns</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900 dark:text-white">pdf-lib</td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">MIT</span></td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Permitted</td>
                <td className="p-4">Core PDF modification, merging, splitting, rotation, watermarking, encryption</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900 dark:text-white">pdfjs-dist</td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">Apache-2.0</span></td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Permitted</td>
                <td className="p-4">Browser-side PDF page rendering, canvas extraction, text layer parsing</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900 dark:text-white">tesseract.js</td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">Apache-2.0</span></td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Permitted</td>
                <td className="p-4">Client-side Optical Character Recognition (OCR) neural engine</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900 dark:text-white">jsPDF</td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">MIT</span></td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Permitted</td>
                <td className="p-4">PDF document generation from plain text and markdown</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900 dark:text-white">JSZip</td>
                <td className="p-4"><span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">MIT</span></td>
                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">Permitted</td>
                <td className="p-4">ZIP archive creation for batch exports and image extractions</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8 px-4 animate-fade-in text-slate-700 dark:text-slate-300">
      <MetaTags
        title={type.toUpperCase() + ' - PDFCraft'}
        description={`Legal policies and disclosures for PDFCraft.`}
      />

      <button
        onClick={onNavigateHome}
        className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-heading capitalize">
          {type.replace('-', ' ')}
        </h1>

        {type === 'privacy' && (
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Privacy First Principle
            </p>
            <p>
              At PDFCraft, document privacy is our top priority. Unlike traditional online PDF tools that upload your personal documents to remote cloud servers, PDFCraft processes your files 100% inside your web browser.
            </p>
            <h3 className="font-bold text-slate-900 dark:text-white text-base font-heading">Data Collection & Storage</h3>
            <p>
              We do NOT collect, store, transmit, or analyze the contents of your PDF files or images. Files remain strictly inside your browser memory (RAM) during processing and are immediately discarded upon browser refresh.
            </p>
            <h3 className="font-bold text-slate-900 dark:text-white text-base font-heading">Third-Party Advertising</h3>
            <p>
              We use legitimate third-party advertising partners (such as Google AdSense) to display ads. These partners may use cookies to serve relevant ads based on non-personally identifiable visit metadata.
            </p>
          </div>
        )}

        {type === 'about' && (
          <div className="space-y-4 text-sm leading-relaxed">
            <p>
              PDFCraft is a high-performance web platform designed to combine all essential PDF tools into one sleek, privacy-conscious interface.
            </p>
            <p>
              By leveraging WebAssembly and modern browser JavaScript engines, we eliminate the need for server uploads—offering instant processing speed, total confidentiality, and zero server queues.
            </p>
          </div>
        )}

        {type === 'terms' && (
          <div className="space-y-4 text-sm leading-relaxed">
            <h3 className="font-bold text-slate-900 dark:text-white text-base font-heading">Terms of Service</h3>
            <p>
              By using PDFCraft, you agree to use our tools responsibly and in compliance with all applicable laws. You retain full copyright and ownership of all documents processed through our tools.
            </p>
          </div>
        )}

        {type === 'cookie-policy' && (
          <div className="space-y-4 text-sm leading-relaxed">
            <h3 className="font-bold text-slate-900 dark:text-white text-base font-heading">Cookie Disclosure</h3>
            <p>
              PDFCraft uses essential browser local storage to save user preferences such as your Dark/Light theme selection. Third-party ad vendors may set anonymous advertising cookies.
            </p>
          </div>
        )}

        {type === 'disclaimer' && (
          <div className="space-y-4 text-sm leading-relaxed">
            <h3 className="font-bold text-slate-900 dark:text-white text-base font-heading">Legal Disclaimer</h3>
            <p>
              PDFCraft electronic signatures and tools are provided "as is" without warranty. While electronic signatures are widely valid for commercial agreements, users are advised to verify jurisdiction-specific digital signature requirements.
            </p>
          </div>
        )}

        {type === 'contact' && (
          <div className="space-y-4 text-sm leading-relaxed">
            <p className="flex items-center gap-2 font-semibold">
              <Mail className="w-5 h-5 text-indigo-500" /> Have questions or suggestions?
            </p>
            <p>
              Contact our team directly at <a href="mailto:vaultmediahub@gmail.com" className="text-indigo-600 dark:text-indigo-400 font-semibold underline">vaultmediahub@gmail.com</a>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
