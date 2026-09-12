'use client';

import React from 'react';
import { THEME } from '@/constants/theme';

interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  iconColor?: string;
  color?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatCard({
  label,
  title,
  value,
  subtitle,
  icon,
  iconColor,
  color,
  trend,
  className = '',
}: StatCardProps) {
  const displayLabel = label || title || '';
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const colorClass =
      iconColor === 'gold' || iconColor === 'amber' || color?.includes('amber') || color?.includes('yellow')
        ? 'text-amber-500'
        : iconColor === 'emerald' || color?.includes('emerald')
        ? 'text-emerald-500'
        : iconColor === 'rose' || color?.includes('rose')
        ? 'text-rose-500'
        : iconColor === 'blue' || color?.includes('blue')
        ? 'text-blue-500'
        : iconColor === 'purple' || color?.includes('purple')
        ? 'text-purple-500'
        : 'text-amber-500';

    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className={`w-5 h-5 ${colorClass}`} />;
    }
    return null;
  };

  const renderedIcon = renderIcon();

  return (
    <div className={`${THEME.STAT_CARD} ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={THEME.STAT_LABEL}>{displayLabel}</span>
        {renderedIcon && <div className={THEME.STAT_ICON_WRAPPER}>{renderedIcon}</div>}
      </div>
      <p className={`${THEME.STAT_VALUE} mt-2`}>{value}</p>
      <div className="flex items-center justify-between gap-2 mt-1">
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>}
        {trend && (
          <span
            className={`text-xs font-bold font-mono ${
              trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
