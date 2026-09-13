'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, Home, Lock } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { THEME } from '@/constants/theme';

interface AccessDeniedProps {
  pageTitle?: string;
  userRole?: string;
  requiredModule?: string;
}

export default function AccessDenied({ pageTitle, userRole, requiredModule }: AccessDeniedProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 border border-rose-200 dark:border-rose-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl dark:shadow-rose-950/20 text-center relative overflow-hidden backdrop-blur-xl"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-16 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-700 dark:text-rose-400 text-xs font-bold mb-4">
          <Lock size={13} /> 403 — Yetkisiz Erişim Engeli
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          Bu Modüle Erişim Yetkiniz Bulunmamaktadır
        </h2>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 font-medium">
          {pageTitle ? (
            <>
              <strong className="text-slate-900 dark:text-white font-bold">"{pageTitle}"</strong> sayfasına erişim
              hesabınızın yetki tanımları kapsamında sınırlandırılmıştır.
            </>
          ) : (
            'Talep ettiğiniz ekrana erişim hesabınızın yetki tanımları kapsamında sınırlandırılmıştır.'
          )}
          {userRole && (
            <span className="block mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Mevcut Rolünüz:{' '}
              <span className="font-bold text-amber-600 dark:text-amber-400 uppercase">
                {userRole === 'ADMIN' ? 'Bayi Yetkilisi' : userRole}
              </span>
            </span>
          )}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <Link
            href={ROUTES.DASHBOARD}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <Home size={15} /> Dashboard'a Dön
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs transition-colors"
          >
            <ArrowLeft size={15} /> Önceki Sayfa
          </button>
        </div>
      </motion.div>
    </div>
  );
}
