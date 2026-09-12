'use client';

import React from 'react';
import { THEME } from '@/constants/theme';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  badge?: string;
}

interface LuxuryTabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export default function LuxuryTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: LuxuryTabsProps<T>) {
  return (
    <div className={`${THEME.LUXURY_TABS.CONTAINER} ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={isActive ? THEME.LUXURY_TABS.TAB_ACTIVE : THEME.LUXURY_TABS.TAB_INACTIVE}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`${THEME.LUXURY_TABS.BADGE} ${
                  isActive
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span
                className={`${THEME.LUXURY_TABS.BADGE} ${
                  isActive
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
