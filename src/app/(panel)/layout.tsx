'use client';

import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { THEME } from '@/constants/theme';
import { ThemeProvider } from '@/context/ThemeContext';

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <ThemeProvider>
      <SessionProvider>
        <div className={THEME.LAYOUT_WRAPPER}>
          <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
          <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
            {children}
          </div>
        </div>
      </SessionProvider>
    </ThemeProvider>
  );
}
