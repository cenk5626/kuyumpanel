'use client';

import React, { useState } from 'react';
import { Scale, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { isWebSerialSupported, readWeightFromSerial, simulateScaleWeight } from '@/lib/hardware/scale';
import { SCALE_CONSTANTS } from '@/constants/scale';
import { MESSAGES } from '@/constants/messages';

interface ScaleButtonProps {
  onWeightReceived: (weight: number, isStable: boolean) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  buttonText?: string;
}

export default function ScaleButton({
  onWeightReceived,
  className = '',
  size = 'md',
  buttonText = MESSAGES.SCALE_BUTTON_DEFAULT,
}: ScaleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleReadScale = async (simulate: boolean = false) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (simulate || !isWebSerialSupported()) {
        // Simülasyon modu (tarayıcı desteklemiyorsa veya kullanıcı talep ettiyse)
        const reading = simulateScaleWeight();
        setLastWeight(reading.weight);
        onWeightReceived(reading.weight, reading.isStable);
      } else {
        // Gerçek donanım Web Serial okuma
        const reading = await readWeightFromSerial();
        setLastWeight(reading.weight);
        onWeightReceived(reading.weight, reading.isStable);
      }
    } catch (err: any) {
      console.warn('Terazi okuma uyarısı:', err?.message || err);
      // Donanım hatası aldığında otomatik simülasyon opsiyonu sağla
      const fallback = simulateScaleWeight();
      setLastWeight(fallback.weight);
      onWeightReceived(fallback.weight, fallback.isStable);
      setErrorMsg(MESSAGES.SCALE_ERROR_SIMULATION_APPLIED);
      setTimeout(() => setErrorMsg(null), SCALE_CONSTANTS.ERROR_DISPLAY_MS);
    } finally {
      setIsLoading(false);
      setShowOptions(false);
    }
  };

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2.5',
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => handleReadScale(false)}
        disabled={isLoading}
        title="Kuyumcu terazisinden gramajı otomatik oku (Web Serial)"
        className={`inline-flex items-center justify-center font-medium rounded-lg transition-all shadow-sm active:scale-95 border ${
          lastWeight !== null
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
        } ${sizeStyles[size]} ${className}`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        ) : lastWeight !== null ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <Scale className="w-4 h-4 text-amber-500" />
        )}

        <span>
          {isLoading
            ? MESSAGES.SCALE_BUTTON_READING
            : lastWeight !== null
            ? `${lastWeight.toFixed(3)} gr`
            : buttonText}
        </span>
      </button>

      {/* Simülasyon / Hızlı Seçenek Butonu */}
      <button
        type="button"
        onClick={() => handleReadScale(true)}
        title="Donanımsız Demo Simülasyonu Yap"
        className="ml-1 p-1 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>

      {/* Geçici Bilgi / Hata Mesajı */}
      {errorMsg && (
        <div className="absolute top-full left-0 mt-1 z-30 bg-amber-900/90 text-amber-200 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap flex items-center gap-1 border border-amber-500/40">
          <AlertCircle className="w-3 h-3 text-amber-400" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
