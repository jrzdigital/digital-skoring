import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, SwitchCamera, AlertCircle, Upload } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (photoBase64: string, caption: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('Dokumentasi Latihan');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, capturedPhoto]);

  const startCamera = async () => {
    setIsLoading(true);
    setCameraError(null);
    stopCamera();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Perangkat atau browser ini tidak mendukung akses kamera langsung. Anda dapat memilih foto dari galeri atau berkas.');
      setIsLoading(false);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      console.warn('Camera access restriction:', err);
      const isNotAllowed = err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message.toLowerCase().includes('denied') || err.message.toLowerCase().includes('not allowed'));
      
      if (isNotAllowed) {
        setCameraError('Izin akses kamera diblokir atau belum diizinkan. Silakan beri izin kamera pada browser atau pilih foto langsung dari perangkat Anda.');
      } else {
        setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera aktif atau unggah foto dari perangkat.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 1080, 1080, 0.75);
      if (compressed) {
        setCapturedPhoto(compressed);
        setCameraError(null);
        stopCamera();
      }
    } catch (err) {
      console.warn('Image processing error:', err);
    } finally {
      e.target.value = '';
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = Math.min(video.videoWidth || 640, 1280);
    canvas.height = Math.min(video.videoHeight || 480, 960);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror image
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto, caption);
      setCapturedPhoto(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-tight">Ambil Foto Latihan Langsung</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Kamera live untuk bukti kehadiran & dokumentasi materi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col items-center gap-4 bg-zinc-950/80">
          {/* Hidden File Input for Direct Gallery / Native Camera Photo */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />

          {cameraError ? (
            <div className="w-full p-6 text-center bg-red-950/20 border border-red-800/40 rounded-xl flex flex-col items-center gap-3.5">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white uppercase">Akses Kamera Belum Tersedia</p>
                <p className="text-xs text-red-200">{cameraError}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={startCamera}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Coba Lagi
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Pilih / Ambil Foto File
                </button>
              </div>
            </div>
          ) : capturedPhoto ? (
            <div className="w-full flex flex-col gap-3">
              <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-zinc-700 bg-black">
                <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded text-[10px] text-red-400 font-mono font-bold uppercase border border-red-900/50">
                  Hasil Foto Terambil
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1 font-mono uppercase text-[10px]">
                  Keterangan / Caption Foto:
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Contoh: Sesi Kuda-kuda tengah siswa putra"
                  className="w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
                />
              </div>
            </div>
          ) : (
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-zinc-800 bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {isLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 text-zinc-300 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                  Mengaktifkan Sensor Kamera...
                </div>
              )}

              {/* Controls overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm border border-zinc-700 transition-colors"
                  title="Ganti Kamera Depan / Belakang"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              </div>

              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 rounded text-[10px] text-zinc-300 font-mono uppercase">
                Live Video Feed
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-zinc-800 bg-zinc-950">
          {capturedPhoto ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 border border-zinc-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Foto Ulang
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-600 text-white rounded-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Gunakan Foto
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!!cameraError || isLoading}
                onClick={takeSnapshot}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Ambil Gambar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
