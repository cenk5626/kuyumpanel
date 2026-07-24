'use client';

import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

interface ThemeToggleProps {
  isCollapsed?: boolean;
  className?: string;
}

export default function ThemeToggle({ isCollapsed = false, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
      className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        isDark
          ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20'
          : 'text-amber-700 bg-amber-100 border border-amber-300 hover:bg-amber-200'
      } ${isCollapsed ? 'justify-center px-0' : 'w-full justify-between'} ${className}`}
    >
      <div className="flex items-center">
        <motion.div
          initial={false}
          animate={{ rotate: isDark ? 0 : 180, scale: [0.8, 1.1, 1] }}
          transition={{ duration: 0.3 }}
          className={isCollapsed ? '' : 'mr-3'}
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-amber-700" />
          )}
        </motion.div>
        {!isCollapsed && (
          <span className="font-semibold select-none">
            {isDark ? 'Aydınlık Mod' : 'Karanlık Mod'}
          </span>
        )}
      </div>

      {!isCollapsed && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
          isDark ? 'bg-yellow-500/20 text-yellow-300' : 'bg-amber-200 text-amber-900'
        }`}>
          {isDark ? 'Karanlık' : 'Aydınlık'}
        </span>
      )}
    </motion.button>
  );
}
