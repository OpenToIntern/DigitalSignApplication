import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';

// Configure the worker source using unpkg CDN matching the installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  page: number;
  onLoadSuccess?: (pdfInfo: { pageCount: number; width: number; height: number }) => void;
  scale?: number;
}

export default function PDFViewer({ url, page, onLoadSuccess, scale = 1.25 }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [pdf, setPdf] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load PDF document
  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setError(null);

    const loadingTask = pdfjsLib.getDocument({ url });
    loadingTask.promise
      .then((loadedPdf) => {
        setPdf(loadedPdf);
      })
      .catch((err) => {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document.');
        setLoading(false);
      });
  }, [url]);

  // Render specific page when PDF or page number changes
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    setLoading(true);

    pdf.getPage(page)
      .then((pdfPage: any) => {
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        // Get viewport with desired scale
        const viewport = pdfPage.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = pdfPage.render(renderContext);
        renderTask.promise.then(() => {
          setLoading(false);
          if (onLoadSuccess) {
            onLoadSuccess({
              pageCount: pdf.numPages,
              width: viewport.width,
              height: viewport.height,
            });
          }
        });
      })
      .catch((err: any) => {
        console.error('Error rendering page:', err);
        setError('Error rendering page.');
        setLoading(false);
      });
  }, [pdf, page, scale]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-slate-50 rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm font-semibold bg-white p-5 text-center z-10">
          {error}
        </div>
      )}
      <canvas ref={canvasRef} className="shadow-md max-w-full object-contain" style={{ display: error ? 'none' : 'block' }} />
    </div>
  );
}
