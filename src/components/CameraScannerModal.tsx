'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, RefreshCw, Zap, Volume2, VolumeX, CheckCircle, AlertTriangle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ANIM, THEME } from '@/constants/theme';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function CameraScannerModal({ isOpen, onClose, onScan }: CameraScannerModalProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [continuousMode, setContinuousMode] = useState(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Beep sound generator
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  // Kameraları al
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          const formatted = devices.map(d => ({ id: d.id, label: d.label || `Kamera (${d.id.substring(0, 5)}...)` }));
          setCameras(formatted);
          // Arka kamerayı veya ilk kamerayı seç
          const backCam = formatted.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('arka'));
          setSelectedCameraId(backCam ? backCam.id : formatted[0].id);
        } else {
          setError('Kamera bulunamadı. Lütfen cihazınızın kamera izinlerini kontrol edin.');
        }
      })
      .catch(err => {
        console.error('Camera get error:', err);
        setError('Kamera erişim izni verilemedi. Lütfen tarayıcı ayarlarından kameraya izin verin.');
      });
  }, [isOpen]);

  // Kamerayı başlat
  useEffect(() => {
    if (!isOpen || !selectedCameraId) return;

    let isMounted = true;
    const scannerId = 'camera-reader-element';

    // Önceki scanner varsa temizle
    if (html5QrcodeRef.current) {
      html5QrcodeRef.current.stop().catch(() => {}).finally(() => {
        if (isMounted) startScanner(selectedCameraId, scannerId);
      });
    } else {
      startScanner(selectedCameraId, scannerId);
    }

    function startScanner(cameraId: string, elementId: string) {
      try {
        const qr = new Html5Qrcode(elementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });

        html5QrcodeRef.current = qr;
        setIsScanning(true);
        setError(null);

        qr.start(
          cameraId,
          {
            fps: 15,
            qrbox: { width: 280, height: 160 }, // Barkod okutma dikdörtgen kutusu
            aspectRatio: 1.777778,
          },
          (decodedText) => {
            playBeep();
            setLastScanned(decodedText);
            onScan(decodedText);

            if (!continuousMode) {
              // Tekli modda okutma başarılıysa kamerayı kapat
              stopScanner();
              onClose();
            }
          },
          () => {
            // Hata yok, kare taraması devam ediyor
          }
        ).catch(err => {
          console.error('Scanner start error:', err);
          setIsScanning(false);
          setError('Kamera başlatılamadı. Kamera başka bir uygulama tarafından kullanılıyor olabilir.');
        });
      } catch (e) {
        console.error('Scanner inst error:', e);
        setError('Tarayıcı bileşeni yüklenemedi.');
      }
    }

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, selectedCameraId, continuousMode]);

  const stopScanner = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().catch(err => console.warn('Stop failed:', err));
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          {...ANIM.SCALE_UP}
          className="w-full max-w-lg bg-gray-900 border border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* MODAL BAŞLIĞI */}
          <div className="px-6 py-4 bg-gray-950 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Kamera İle Barkod Okut</h3>
                <p className="text-[11px] text-gray-400">Kamerayı takı ürününün barkoduna doğrultun</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-colors"
              >
                {soundEnabled ? <Volume2 size={16} className="text-yellow-400" /> : <VolumeX size={16} className="text-gray-500" />}
              </button>
              <button
                onClick={handleClose}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* KAMERA GÖRÜNTÜ ALANI */}
          <div className="relative bg-black flex-1 min-h-[320px] flex items-center justify-center overflow-hidden">
            {/* HTML5 QR Container */}
            <div id="camera-reader-element" className="w-full h-full object-cover"></div>

            {/* SCANNING OVERLAY LASER & VIEWFINDER */}
            {isScanning && !error && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Viewfinder box */}
                <div className="w-72 h-44 border-2 border-yellow-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(234,179,8,0.3)] bg-yellow-500/5">
                  {/* Corners */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-400 rounded-br-xl" />

                  {/* Lazer çizgi efekti */}
                  <motion.div
                    animate={{ y: [0, 150, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_12px_#f59e0b]"
                  />
                </div>
                <p className="text-[11px] font-bold text-yellow-400 bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur-sm border border-yellow-500/20">
                  Barkodu sarı çerçevenin ortasına hizalayın
                </p>
              </div>
            )}

            {/* HATA MESAJI */}
            {error && (
              <div className="absolute inset-0 bg-gray-950/90 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <AlertTriangle className="text-amber-500" size={36} />
                <p className="text-xs text-gray-300 max-w-xs">{error}</p>
                <button
                  onClick={() => setSelectedCameraId(selectedCameraId)}
                  className="px-4 py-2 bg-yellow-500 text-black font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw size={14} /> Tekrar Dene
                </button>
              </div>
            )}
          </div>

          {/* KAMERA KONTROLLERİ VE SON OKUNAN BARKOD */}
          <div className="p-4 bg-gray-950 border-t border-gray-800 space-y-3">
            {/* KAMERA SEÇİMİ VE MOD TOGGLE */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                {cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={e => setSelectedCameraId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-yellow-500/50"
                  >
                    {cameras.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* MOD TOGGLE */}
              <button
                onClick={() => setContinuousMode(!continuousMode)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  continuousMode
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {continuousMode ? '⚡ Seri Okutma Açık' : '🎯 Tekli Okutma'}
              </button>
            </div>

            {/* SON OKUNAN BARKOD BİLDİRİMİ */}
            {lastScanned && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                <span className="flex items-center gap-1.5 font-bold font-mono">
                  <CheckCircle size={14} /> Son Okutulan: {lastScanned}
                </span>
                <span className="text-[10px] text-gray-400">Sepete eklendi</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
