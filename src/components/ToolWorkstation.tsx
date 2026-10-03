import React, { useState } from 'react';
import {
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Sliders,
  Sparkles
} from 'lucide-react';
import type { PDFTool } from '../registry/tools';
import { FileDropzone } from './FileDropzone';
import { AdSlot } from './AdSlot';
import {
  mergePDFs,
  splitPDF,
  compressPDF,
  imagesToPDF,
  pdfToImages,
  rotatePDF,
  deletePagesPDF,
  extractPagesPDF,
  addWatermarkPDF,
  addPageNumbersPDF,
  protectPDF,
  unlockPDF,
  extractTextPDF,
  extractImagesPDF,
  getPDFMetadata,
  updatePDFMetadata,
  getPDFInfo,
  ocrPDF,
  signPDF,
  editPDF,
  textToPDF,
  markdownToPDF,
  downloadBlob
} from '../utils/pdfEngine';

interface ToolWorkstationProps {
  tool: PDFTool;
}

export const ToolWorkstation: React.FC<ToolWorkstationProps> = ({ tool }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tool specific options
  const [splitMode, setSplitMode] = useState<'range' | 'everyN'>('range');
  const [splitRange, setSplitRange] = useState('1-2');
  const [splitEveryN, setSplitEveryN] = useState(1);

  const [compressLevel, setCompressLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [compressStats, setCompressStats] = useState<{ orig: number; newSize: number } | null>(null);

  const [pageOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageSize] = useState<'fit' | 'a4' | 'letter'>('a4');

  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);

  const [pageNumPos] = useState('bottom-center');

  const [password, setPassword] = useState('');

  const [ocrLang] = useState('eng');
  const [extractedText, setExtractedText] = useState('');

  const [metaFields, setMetaFields] = useState({ title: '', author: '', subject: '', keywords: '' });
  const [pdfInfoData, setPdfInfoData] = useState<any>(null);

  const [rawText, setRawText] = useState('# My Document Title\n\nThis is a sample Markdown document formatted with PDFCraft.');

  const [signatureText, setSignatureText] = useState('John Doe');

  // Output blob ready for download
  const [resultBlob, setResultBlob] = useState<{ blob: Blob; filename: string } | null>(null);

  const handleFilesSelected = async (newFiles: File[]) => {
    setErrorMsg('');
    setSuccessMsg('');
    setResultBlob(null);

    if (tool.id === 'merge-pdf' || tool.id === 'jpg-to-pdf') {
      setFiles((prev) => [...prev, ...newFiles]);
    } else {
      setFiles(newFiles.slice(0, 1));

      if (newFiles[0] && tool.id === 'pdf-metadata') {
        try {
          const meta = await getPDFMetadata(newFiles[0]);
          setMetaFields({
            title: meta.title || '',
            author: meta.author || '',
            subject: meta.subject || '',
            keywords: meta.keywords || ''
          });
        } catch {
          /* ignore */
        }
      } else if (newFiles[0] && tool.id === 'pdf-info') {
        try {
          const info = await getPDFInfo(newFiles[0]);
          setPdfInfoData(info);
        } catch {
          /* ignore */
        }
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResultBlob(null);
  };

  const handleProcess = async () => {
    if (files.length === 0 && tool.id !== 'text-to-pdf' && tool.id !== 'markdown-to-pdf') {
      setErrorMsg('Please upload a file first.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    setProgressText('Processing PDF...');
    setProgressPct(20);

    try {
      let outputBytes: Uint8Array | null = null;
      let outFilename = `${tool.slug}_output.pdf`;

      switch (tool.id) {
        case 'merge-pdf':
          outputBytes = await mergePDFs(files);
          outFilename = 'merged_document.pdf';
          break;

        case 'split-pdf': {
          const splitResults = await splitPDF(files[0], {
            mode: splitMode,
            rangeStr: splitRange,
            everyN: splitEveryN
          });
          if (splitResults.length === 1) {
            outputBytes = splitResults[0].pdfBytes;
            outFilename = splitResults[0].filename;
          } else if (splitResults.length > 1) {
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            splitResults.forEach((res) => zip.file(res.filename, res.pdfBytes));
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            setResultBlob({ blob: zipBlob, filename: 'split_pdf_files.zip' });
            setSuccessMsg(`Split successfully into ${splitResults.length} files!`);
            setProcessing(false);
            return;
          }
          break;
        }

        case 'compress-pdf': {
          const res = await compressPDF(files[0], compressLevel);
          outputBytes = res.pdfBytes;
          outFilename = `compressed_${files[0].name}`;
          setCompressStats({ orig: res.originalSize, newSize: res.newSize });
          break;
        }

        case 'pdf-to-jpg': {
          const images = await pdfToImages(files[0], 'jpg', 2.0);
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          images.forEach((img) => {
            const data = img.dataUrl.replace(/^data:image\/jpeg;base64,/, '');
            zip.file(`page_${img.pageNum}.jpg`, data, { base64: true });
          });
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          setResultBlob({ blob: zipBlob, filename: `${files[0].name}_jpgs.zip` });
          setSuccessMsg(`Exported ${images.length} pages to JPG!`);
          setProcessing(false);
          return;
        }

        case 'jpg-to-pdf':
          outputBytes = await imagesToPDF(files, {
            pageSize,
            orientation: pageOrientation,
            margin: 10
          });
          outFilename = 'converted_images.pdf';
          break;

        case 'rotate-pdf':
          outputBytes = await rotatePDF(files[0], 90);
          outFilename = `rotated_${files[0].name}`;
          break;

        case 'delete-pdf-pages':
          outputBytes = await deletePagesPDF(files[0], [1]);
          outFilename = `trimmed_${files[0].name}`;
          break;

        case 'extract-pages':
          outputBytes = await extractPagesPDF(files[0], [1]);
          outFilename = `extracted_${files[0].name}`;
          break;

        case 'watermark-pdf':
          outputBytes = await addWatermarkPDF(files[0], watermarkText, { opacity: watermarkOpacity });
          outFilename = `watermarked_${files[0].name}`;
          break;

        case 'add-page-numbers':
          outputBytes = await addPageNumbersPDF(files[0], { position: pageNumPos });
          outFilename = `numbered_${files[0].name}`;
          break;

        case 'protect-pdf':
          outputBytes = await protectPDF(files[0], password);
          outFilename = `protected_${files[0].name}`;
          break;

        case 'unlock-pdf':
          outputBytes = await unlockPDF(files[0], password);
          outFilename = `unlocked_${files[0].name}`;
          break;

        case 'pdf-to-text': {
          const txt = await extractTextPDF(files[0]);
          setExtractedText(txt);
          const txtBlob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
          setResultBlob({ blob: txtBlob, filename: `${files[0].name}_extracted.txt` });
          setSuccessMsg('Text extracted successfully!');
          setProcessing(false);
          return;
        }

        case 'ocr-pdf': {
          const ocrResult = await ocrPDF(files[0], ocrLang, (pct) => setProgressPct(pct));
          setExtractedText(ocrResult);
          const txtBlob = new Blob([ocrResult], { type: 'text/plain;charset=utf-8' });
          setResultBlob({ blob: txtBlob, filename: `${files[0].name}_ocr.txt` });
          setSuccessMsg('OCR Recognition completed!');
          setProcessing(false);
          return;
        }

        case 'extract-images': {
          const zipBlob = await extractImagesPDF(files[0]);
          setResultBlob({ blob: zipBlob, filename: `${files[0].name}_extracted_images.zip` });
          setSuccessMsg('Extracted all graphics into ZIP file!');
          setProcessing(false);
          return;
        }

        case 'pdf-metadata':
          outputBytes = await updatePDFMetadata(files[0], metaFields);
          outFilename = `updated_metadata_${files[0].name}`;
          break;

        case 'text-to-pdf':
          outputBytes = textToPDF(rawText);
          outFilename = 'document.pdf';
          break;

        case 'markdown-to-pdf':
          outputBytes = markdownToPDF(rawText);
          outFilename = 'document.pdf';
          break;

        case 'sign-pdf': {
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 400, 120);
            ctx.font = 'italic bold 36px Georgia, serif';
            ctx.fillStyle = '#1e1b4b';
            ctx.fillText(signatureText, 20, 70);
          }
          const sigUrl = canvas.toDataURL('image/png');
          outputBytes = await signPDF(files[0], sigUrl, { pageNum: 1, xPct: 60, yPct: 80 });
          outFilename = `signed_${files[0].name}`;
          break;
        }

        case 'edit-pdf':
          outputBytes = await editPDF(files[0], [
            { type: 'text', page: 1, x: 50, y: 100, text: 'Edited with PDFCraft' }
          ]);
          outFilename = `edited_${files[0].name}`;
          break;

        default:
          outputBytes = await mergePDFs(files);
          break;
      }

      if (outputBytes) {
        const blob = new Blob([new Uint8Array(outputBytes)], { type: 'application/pdf' });
        setResultBlob({ blob, filename: outFilename });
        setSuccessMsg('Processing completed successfully!');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during file processing.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> {tool.categoryName}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-heading">
          {tool.seo.h1}
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {tool.seo.intro}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
        {tool.id !== 'text-to-pdf' && tool.id !== 'markdown-to-pdf' && (
          <FileDropzone
            multiple={tool.id === 'merge-pdf' || tool.id === 'jpg-to-pdf'}
            accept={tool.id === 'jpg-to-pdf' ? 'image/*' : '.pdf,application/pdf'}
            onFilesSelected={handleFilesSelected}
            files={files}
            onRemoveFile={handleRemoveFile}
            label={tool.id === 'jpg-to-pdf' ? 'Choose Image Files (JPG, PNG, WebP)' : 'Choose PDF File'}
          />
        )}

        {(tool.id === 'text-to-pdf' || tool.id === 'markdown-to-pdf') && (
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900 dark:text-white font-heading">
              {tool.id === 'markdown-to-pdf' ? 'Enter Markdown Text' : 'Enter Plain Text'}
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {files.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider font-heading flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" /> Tool Settings
            </h4>

            {tool.id === 'split-pdf' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Split Mode
                  </label>
                  <select
                    value={splitMode}
                    onChange={(e: any) => setSplitMode(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="range">Custom Page Range (e.g. 1-3, 5)</option>
                    <option value="everyN">Split Every N Pages</option>
                  </select>
                </div>
                {splitMode === 'range' ? (
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Page Ranges
                    </label>
                    <input
                      type="text"
                      value={splitRange}
                      onChange={(e) => setSplitRange(e.target.value)}
                      placeholder="e.g. 1-2, 3-5"
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Split Every N Pages
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={splitEveryN}
                      onChange={(e) => setSplitEveryN(parseInt(e.target.value) || 1)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {tool.id === 'compress-pdf' && (
              <div className="space-y-2">
                <label className="block font-semibold text-sm text-slate-700 dark:text-slate-300">
                  Compression Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'high', label: 'Extreme', desc: 'Highest compression' },
                    { id: 'medium', label: 'Recommended', desc: 'Balanced quality' },
                    { id: 'low', label: 'Less', desc: 'High visual quality' }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => setCompressLevel(lvl.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        compressLevel === lvl.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-sm">{lvl.label}</div>
                      <div className="text-[10px] opacity-70">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tool.id === 'watermark-pdf' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Opacity ({Math.round(watermarkOpacity * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 mt-2"
                  />
                </div>
              </div>
            )}

            {(tool.id === 'protect-pdf' || tool.id === 'unlock-pdf') && (
              <div>
                <label className="block font-semibold mb-1 text-sm text-slate-700 dark:text-slate-300">
                  Document Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password..."
                  className="w-full sm:w-1/2 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {tool.id === 'sign-pdf' && (
              <div>
                <label className="block font-semibold mb-1 text-sm text-slate-700 dark:text-slate-300">
                  Signature Name
                </label>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Type your full name to generate signature..."
                  className="w-full sm:w-1/2 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            )}

            {tool.id === 'pdf-metadata' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block font-semibold mb-1">Title</label>
                  <input
                    type="text"
                    value={metaFields.title}
                    onChange={(e) => setMetaFields({ ...metaFields, title: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Author</label>
                  <input
                    type="text"
                    value={metaFields.author}
                    onChange={(e) => setMetaFields({ ...metaFields, author: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}

            {tool.id === 'pdf-info' && pdfInfoData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border">
                  <div className="text-slate-400">Pages</div>
                  <div className="font-bold text-base">{pdfInfoData.pageCount}</div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border">
                  <div className="text-slate-400">File Size</div>
                  <div className="font-bold text-base">{pdfInfoData.fileSizeFormatted}</div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border">
                  <div className="text-slate-400">Dimensions</div>
                  <div className="font-bold text-base">{pdfInfoData.dimensionsMm}</div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border">
                  <div className="text-slate-400">Encrypted</div>
                  <div className="font-bold text-base">{pdfInfoData.isEncrypted}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {compressStats && (
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm flex items-center justify-between">
            <div>
              Original: <span className="font-bold">{(compressStats.orig / (1024 * 1024)).toFixed(2)} MB</span> | Compressed:{' '}
              <span className="font-bold">{(compressStats.newSize / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
            <div className="font-extrabold text-indigo-600 dark:text-indigo-400 px-3 py-1 bg-white dark:bg-slate-900 rounded-lg shadow-xs">
              Saved {Math.max(0, Math.round((1 - compressStats.newSize / compressStats.orig) * 100))}%
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          {!resultBlob ? (
            <button
              onClick={handleProcess}
              disabled={processing || (files.length === 0 && tool.id !== 'text-to-pdf' && tool.id !== 'markdown-to-pdf')}
              className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base shadow-xl"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{progressText} ({progressPct}%)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Execute {tool.name}</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => downloadBlob(resultBlob.blob, resultBlob.filename)}
              className="btn-primary w-full sm:w-auto px-10 py-4 text-base bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
            >
              <Download className="w-5 h-5" />
              <span>Download {resultBlob.filename}</span>
            </button>
          )}
        </div>

        {extractedText && (
          <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Extracted Text Output
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(extractedText)}
                className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold hover:underline"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Text
              </button>
            </div>
            <textarea
              readOnly
              rows={6}
              value={extractedText}
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-700 dark:text-slate-300"
            />
          </div>
        )}

        <AdSlot type="result-area" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            How to use {tool.name}
          </h3>
          <div className="space-y-3">
            {tool.seo.howToSteps.map((stepItem, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white text-sm font-heading mb-1">
                  {stepItem.step}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {stepItem.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
            Key Features & FAQ
          </h3>
          <div className="space-y-3">
            {tool.seo.features.map((feat, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <div className="font-bold text-indigo-900 dark:text-indigo-300 text-sm font-heading mb-1">
                  {feat.title}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {feat.desc}
                </p>
              </div>
            ))}
            {tool.seo.faqs.map((faq, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                  Q: {faq.question}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
