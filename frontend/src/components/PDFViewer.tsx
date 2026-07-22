import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

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
  const { token } = useApp();

  // Load PDF document
  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setError(null);

    let objectUrl = '';
    let isCancelled = false;

    const fetchPdf = async () => {
      try {
        const headers: HeadersInit = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const blob = await res.blob();
        if (isCancelled) return;
        objectUrl = URL.createObjectURL(blob);

        const loadingTask = pdfjsLib.getDocument({ url: objectUrl });
        const loadedPdf = await loadingTask.promise;
        if (isCancelled) return;
        setPdf(loadedPdf);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error loading PDF:', err);
          setError('Failed to load PDF document.');
          setLoading(false);
        }
      }
    };

    fetchPdf();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url, token]);

  const renderTaskRef = useRef<any>(null);

  // Render specific page when PDF or page number changes
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    setLoading(true);

    let activeRenderTask: any = null;

    pdf.getPage(page)
      .then((pdfPage: any) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        // Cancel previous render task if active
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        // Render at device-pixel resolution while keeping CSS dimensions in PDF units.
        // This keeps text, page edges, and overlays visually crisp when zoom changes.
        const viewport = pdfPage.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          transform: outputScale !== 1
            ? [outputScale, 0, 0, outputScale, 0, 0]
            : undefined,
        };

        const renderTask = pdfPage.render(renderContext);
        renderTaskRef.current = renderTask;
        activeRenderTask = renderTask;

        return renderTask.promise.then(() => {
          if (renderTaskRef.current === activeRenderTask) {
            renderTaskRef.current = null;
          }
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
        if (err && err.name === 'RenderingCancelledException') {
          // Silent ignore for cancelled renders
          return;
        }
        console.error('Error rendering page:', err);
        setError('Error rendering page.');
        setLoading(false);
      });

    return () => {
      if (activeRenderTask) {
        activeRenderTask.cancel();
      }
    };
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
