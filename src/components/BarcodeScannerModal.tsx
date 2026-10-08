import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras / QR Code'
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [hasScanned, setHasScanned] = useState(false);
  const [isDetectorSupported, setIsDetectorSupported] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setError(null);
      setHasScanned(false);
      setManualCode('');
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Check if native BarcodeDetector is available (supported in Chrome/Android/Edge)
      if ('BarcodeDetector' in window) {
        setIsDetectorSupported(true);
        startScanningLoop();
      } else {
        setIsDetectorSupported(false);
      }
    } catch (err: any) {
      console.warn('Erro ao acessar câmera:', err);
      setError(err.message || 'Permissão de câmera negada ou dispositivo indisponível.');
    }
  };

  const startScanningLoop = () => {
    if (!('BarcodeDetector' in window)) return;

    // @ts-ignore
    const detector = new window.BarcodeDetector({
      formats: [
        'code_128',
        'code_39',
        'code_93',
        'ean_13',
        'ean_8',
        'qr_code',
        'data_matrix',
        'itf',
        'upc_a',
        'upc_e'
      ]
    });

    let animationFrameId: number;

    const detect = async () => {
      if (!videoRef.current || !isOpen || hasScanned) return;

      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            const rawVal = barcodes[0].rawValue.trim();
            handleSuccess(rawVal);
            return;
          }
        } catch (e) {
          // ignore frame scan errors
        }
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    animationFrameId = requestAnimationFrame(detect);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      // ignore
    }
  };

  const handleSuccess = (code: string) => {
    if (hasScanned) return;
    setHasScanned(true);
    playBeep();
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    stopCamera();
    onScan(code);
    onClose();
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities: any = track.getCapabilities?.() || {};
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: !torchOn } as any]
          });
          setTorchOn(!torchOn);
        }
      } catch (e) {
        console.warn('Torch not supported:', e);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-slate-300 space-y-3">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
              <p className="text-sm">{error}</p>
              <p className="text-xs text-slate-400">
                Você pode digitar o código ou número de série manualmente abaixo:
              </p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover min-h-[300px]"
              />

              {/* Aiming Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                <div className="w-64 h-40 border-2 border-blue-400/80 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  {/* Laser line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-medium bg-black/60 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                    Aponte para o código de barras
                  </span>
                </div>
              </div>

              {/* Controls bar */}
              <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                <button
                  type="button"
                  onClick={toggleCamera}
                  className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md shadow-lg"
                  title="Trocar câmera"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2.5 rounded-full backdrop-blur-md shadow-lg transition-colors ${
                    torchOn ? 'bg-yellow-400 text-slate-900' : 'bg-slate-900/80 hover:bg-slate-800 text-white'
                  }`}
                  title="Lanterna"
                >
                  <Zap className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Manual entry fallback */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Digitar ou colar código / serial manualmente:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Ex: BRJ2423BQ8 ou 5A33D0X4Q"
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualCode.trim()) {
                  handleSuccess(manualCode.trim());
                }
              }}
            />
            <button
              type="button"
              disabled={!manualCode.trim()}
              onClick={() => handleSuccess(manualCode.trim())}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Usar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
