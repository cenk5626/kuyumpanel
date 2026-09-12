'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { THEME, ANIM } from '@/constants/theme';

export interface BadgeItem {
  label: string;
  variant?: 'gold' | 'warning' | 'success' | 'danger' | 'neutral' | string;
}

const BADGE_VARIANTS: Record<string, string> = {
  gold: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
  danger: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30',
  neutral: 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30',
};

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  badges?: React.ReactNode | BadgeItem[];
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  icon,
  badges,
  actions,
  className = '',
}: PageHeaderProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null)) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-6 h-6 text-amber-500" />;
    }
    return null;
  };

  const renderBadges = () => {
    if (!badges) return null;
    if (Array.isArray(badges)) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {badges.map((b, idx) => {
            const badgeClass =
              BADGE_VARIANTS[b.variant || 'neutral'] || BADGE_VARIANTS.neutral;
            return (
              <span
                key={idx}
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}
              >
                {b.label}
              </span>
            );
          })}
        </div>
      );
    }
    return <div className="flex items-center gap-2 flex-wrap">{badges}</div>;
  };

  return (
    <header className={`${THEME.PAGE_HEADER.CONTAINER} ${className}`}>
      <motion.div
        {...ANIM.FADE_UP}
        transition={{ duration: ANIM.DURATION.NORMAL }}
        className="flex items-start sm:items-center gap-3 min-w-0"
      >
        {icon && (
          <div className={THEME.PAGE_HEADER.ICON_WRAPPER}>
            {renderIcon()}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={THEME.PAGE_HEADER.TITLE}>{title}</h1>
            {renderBadges()}
          </div>
          {subtitle && <p className={THEME.PAGE_HEADER.SUBTITLE}>{subtitle}</p>}
        </div>
      </motion.div>

      {actions && (
        <motion.div
          {...ANIM.FADE_UP}
          transition={{ duration: ANIM.DURATION.NORMAL, delay: 0.05 }}
          className={THEME.PAGE_HEADER.ACTIONS}
        >
          {actions}
        </motion.div>
      )}
    </header>
  );
}
