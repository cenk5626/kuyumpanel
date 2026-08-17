'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Flame, Activity, Hourglass, PauseCircle } from 'lucide-react';
import {
  STOCK_ALERT_LEVELS,
  TURNOVER_CATEGORIES,
  TURNOVER_STATUS_LABELS,
  type StockAlertLevel,
  type TurnoverCategory,
} from '@/constants/stocks';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface CriticalStockBadgeProps {
  level?: StockAlertLevel;
  amount?: number;
  minThreshold?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

interface TurnoverBadgeProps {
  category: TurnoverCategory;
  dailyVelocity?: number;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

// ─── Kritik Stok Uyarı Rozeti ──────────────────────────────────────────────────

export default function CriticalStockBadge({
  level,
  amount,
  minThreshold = 5,
  size = 'md',
  showIcon = true,
  className = '',
}: CriticalStockBadgeProps) {
  // Eğer level doğrudan verilmediyse amount ve minThreshold'dan hesapla
  let resolvedLevel: StockAlertLevel = level || STOCK_ALERT_LEVELS.SAFE;
  if (!level && amount !== undefined) {
    if (amount <= minThreshold) {
      resolvedLevel = STOCK_ALERT_LEVELS.CRITICAL;
    } else if (amount <= minThreshold * 1.5) {
      resolvedLevel = STOCK_ALERT_LEVELS.WARNING;
    } else {
      resolvedLevel = STOCK_ALERT_LEVELS.SAFE;
    }
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold',
  }[size];

  const config = {
    [STOCK_ALERT_LEVELS.CRITICAL]: {
      label: 'Kritik Stok',
      icon: AlertCircle,
      classes: 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)] animate-pulse',
    },
    [STOCK_ALERT_LEVELS.WARNING]: {
      label: 'Tükenmek Üzere',
      icon: AlertTriangle,
      classes: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
    },
    [STOCK_ALERT_LEVELS.SAFE]: {
      label: 'Güvenli Seviye',
      icon: CheckCircle,
      classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    },
  }[resolvedLevel];

  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold transition-all ${sizeClasses} ${config.classes} ${className}`}
    >
      {showIcon && <IconComponent size={size === 'sm' ? 12 : size === 'lg' ? 16 : 14} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
}

// ─── Devir Hızı / Sirkülasyon Rozeti ───────────────────────────────────────────

export function TurnoverBadge({
  category,
  dailyVelocity,
  size = 'sm',
  showIcon = true,
  className = '',
}: TurnoverBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  const config = {
    [TURNOVER_CATEGORIES.HIZLI]: {
      label: 'Hızlı Devir',
      icon: Flame,
      classes: 'bg-orange-500/15 text-orange-400 border border-orange-500/30 font-extrabold',
    },
    [TURNOVER_CATEGORIES.NORMAL]: {
      label: 'Normal Sirkülasyon',
      icon: Activity,
      classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold',
    },
    [TURNOVER_CATEGORIES.YAVAS]: {
      label: 'Yavaş Devir',
      icon: Hourglass,
      classes: 'bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold',
    },
    [TURNOVER_CATEGORIES.HAREKETSIZ]: {
      label: 'Ölü / Hareketsiz',
      icon: PauseCircle,
      classes: 'bg-gray-800/80 text-gray-400 border border-gray-700 font-medium',
    },
  }[category];

  const IconComponent = config.icon;

  return (
    <span
      title={TURNOVER_STATUS_LABELS[category]}
      className={`inline-flex items-center rounded-full transition-all ${sizeClasses} ${config.classes} ${className}`}
    >
      {showIcon && <IconComponent size={size === 'sm' ? 12 : 14} className="shrink-0" />}
      <span>{config.label}</span>
      {dailyVelocity !== undefined && dailyVelocity > 0 && (
        <span className="opacity-80 font-mono text-[9px] ml-0.5">({dailyVelocity.toFixed(1)}/gün)</span>
      )}
    </span>
  );
}
