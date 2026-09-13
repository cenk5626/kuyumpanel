'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { SessionProvider, useSession } from 'next-auth/react';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import HeaderActions from '@/components/HeaderActions';
import AccessDenied from '@/components/AccessDenied';
import { hasPagePermission } from '@/constants/page-permissions';
import { THEME } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import { MENU_ITEMS } from '@/constants/menu';
import { ThemeProvider } from '@/context/ThemeContext';

function PanelContentGuard({
  children,
  pathname,
  activeItem,
}: {
  children: React.ReactNode;
  pathname: string;
  activeItem: any;
}) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const role = (session?.user as any)?.role;
  const permissions = (session?.user as any)?.permissions;

  const isAuthorized = hasPagePermission(role, permissions, pathname);

  if (!isAuthorized) {
    return (
      <AccessDenied
        pageTitle={activeItem?.label}
        userRole={role}
        requiredModule={pathname}
      />
    );
  }

  return <>{children}</>;
}

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const activeItem = useMemo(() => {
    if (!pathname) return null;
    return MENU_ITEMS.find((item) => item.href === pathname || (item.href !== '/' && pathname.startsWith(item.href)));
  }, [pathname]);

  return (
    <ThemeProvider>
      <SessionProvider>
        <div className={THEME.LAYOUT_WRAPPER}>
          {/* Kenar Çubuğu (Masaüstü & Mobil Drawer) */}
          <Sidebar
            isCollapsed={isCollapsed}
            onToggle={() => setIsCollapsed(!isCollapsed)}
            isMobileOpen={isMobileOpen}
            onCloseMobile={() => setIsMobileOpen(false)}
          />

          {/* Ana İçerik Taşıyıcısı */}
          <div
            className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full min-w-0 ${
              isCollapsed ? 'md:ml-16 ml-0' : 'md:ml-64 ml-0'
            }`}
          >
            {/* Kalıcı Global Üst Çubuk (Hem Masaüstü Hem Mobil) */}
            <header className={THEME.TOPBAR}>
              <div className="flex items-center gap-3">
                {/* Mobil Menü Açma Butonu */}
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(true)}
                  className="md:hidden p-2 -ml-1 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Menüyü Aç"
                >
                  <Menu size={22} />
                </button>

                {/* Mobil Logo & Aktif Sayfa Başlığı */}
                <div className="md:hidden flex items-center gap-1.5 min-w-0">
                  <span className="font-extrabold text-base bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 dark:from-amber-300 dark:via-yellow-400 dark:to-amber-500 bg-clip-text text-transparent tracking-tight flex-shrink-0">
                    {MESSAGES.APP_NAME}
                  </span>
                  {activeItem && (
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[130px]">
                      / {activeItem.label}
                    </span>
                  )}
                </div>

                {/* Masaüstü Sol Bilgi: Canlı Sistem Durum Rozeti & Breadcrumb Navigasyon */}
                <div className="hidden md:flex items-center gap-2.5">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{MESSAGES.HEADER_ONLINE_STATUS}</span>
                  </div>

                  {activeItem && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700">/</span>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800/90 text-slate-800 dark:text-amber-300 border border-slate-200 dark:border-amber-500/20 shadow-xs">
                        <span className="text-slate-400 dark:text-slate-500 font-medium">Modül:</span>
                        <span className="text-amber-700 dark:text-yellow-400">{activeItem.label}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Sağ Aksiyonlar (Alarmlar, Karanlık/Aydınlık Mod, Çıkış Butonu) */}
              <HeaderActions />
            </header>

            {/* Sayfa İçeriği (Responsive Padding ve Kenar Çubuğu Boşluğu) */}
            <main className={THEME.MAIN_WRAPPER}>
              <PanelContentGuard pathname={pathname} activeItem={activeItem}>
                {children}
              </PanelContentGuard>
            </main>
          </div>
        </div>
      </SessionProvider>
    </ThemeProvider>
  );
}

