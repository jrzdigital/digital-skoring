import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';

interface SignaturePadProps {
  initialDataUrl?: string;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
  title: string;
  subtitle?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  initialDataUrl,
  onSave,
  onClear,
  title,
  subtitle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#1e293b'); // Dark blue/black ink
  const [strokeWidth, setStrokeWidth] = useState(2.5);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set high DPI resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    if (initialDataUrl && initialDataUrl.startsWith('data:image')) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasContent(true);
      };
      img.src = initialDataUrl;
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasContent(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    handleSave();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasContent(false);
    if (onClear) onClear();
    onSave('');
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <PenTool className="w-3.5 h-3.5 text-red-500" />
            {title}
          </h4>
          {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {/* Ink color picker */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
            <button
              type="button"
              onClick={() => setStrokeColor('#1e293b')}
              className={`w-3.5 h-3.5 rounded-full bg-slate-900 border ${
                strokeColor === '#1e293b' ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-700'
              }`}
              title="Tinta Hitam / Gelap"
            />
            <button
              type="button"
              onClick={() => setStrokeColor('#1e3a8a')}
              className={`w-3.5 h-3.5 rounded-full bg-blue-900 border ${
                strokeColor === '#1e3a8a' ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-700'
              }`}
              title="Tinta Biru Resmi"
            />
          </div>

          <button
            type="button"
            onClick={clearCanvas}
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors flex items-center gap-1 border border-zinc-800 font-mono"
          >
            <RotateCcw className="w-3 h-3" />
            Hapus
          </button>
        </div>
      </div>

      {/* Canvas Box */}
      <div className="relative w-full h-32 bg-zinc-100 rounded-lg border-2 border-dashed border-zinc-400 overflow-hidden shadow-inner cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full touch-none"
        />
        {!hasContent && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-zinc-500 select-none font-mono text-[11px]">
            Goreskan tanda tangan di area ini (Touch / Mouse)
          </div>
        )}
        <div className="absolute bottom-1 right-2 text-[9px] text-zinc-500 font-mono pointer-events-none select-none uppercase">
          Area Tanda Tangan Digital
        </div>
      </div>
    </div>
  );
};
