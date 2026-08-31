'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { LogOut, Sun, Moon, BellRing } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { motion } from 'framer-motion';
import { ROUTES } from '@/constants/routes';

export default function HeaderActions() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [triggeredAlertsCount, setTriggeredAlertsCount] = useState(0);

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const res = await fetch('/api/alerts');
        if (res.ok) {
          const data = await res.json();
          const triggered = Array.isArray(data) ? data.filter((a: any) => a.isTriggered && a.isActive).length : 0;
          setTriggeredAlertsCount(triggered);
        }
      } catch {
        /* quiet */
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2.5 ml-auto">
      {/* Fiyat Alarmları Hızlı Erişim Butonu */}
      <Link
        href={ROUTES.ALERTS}
        title="Fiyat Alarmları"
        className={`relative flex items-center justify-center p-2 rounded-xl text-xs font-bold transition-all ${
          triggeredAlertsCount > 0
            ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
            : isDark
            ? 'bg-slate-800/80 text-yellow-400 border border-slate-700 hover:border-yellow-500/40 hover:bg-yellow-500/10'
            : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
        }`}
      >
        <BellRing size={16} />
        {triggeredAlertsCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md">
            {triggeredAlertsCount}
          </span>
        )}
      </Link>

      {/* Dark / Light Mode Toggle Button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={toggleTheme}
        type="button"
        title={isDark ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
          isDark
            ? 'bg-slate-800/80 text-amber-400 border border-slate-700 hover:border-amber-500/40 hover:bg-amber-500/10'
            : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
        }`}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isDark ? 0 : 180, scale: [0.8, 1.1, 1] }}
          transition={{ duration: 0.3 }}
        >
          {isDark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-amber-700" />}
        </motion.div>
        <span className="hidden sm:inline select-none">{isDark ? 'Aydınlık Mod' : 'Karanlık Mod'}</span>
      </motion.button>

      {/* Logout (Çıkış Yap) Button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => signOut({ callbackUrl: '/login' })}
        type="button"
        title="Oturumu Kapat"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
      >
        <LogOut size={15} />
        <span className="hidden sm:inline select-none">Çıkış Yap</span>
      </motion.button>
    </div>
  );
}
