'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Users, LogOut, Activity, ChevronLeft, Menu, Package, ArrowLeftRight, Truck, ScanBarcode, UserCheck, History, Building, TrendingUp, ClipboardCheck, FileSpreadsheet, BellRing } from 'lucide-react';
import { MENU_ITEMS } from '@/constants/menu';
import { MESSAGES } from '@/constants/messages';
import { THEME } from '@/constants/theme';
import ThemeToggle from './ThemeToggle';

import { useSession } from 'next-auth/react';

const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  LayoutDashboard,
  Users,
  Activity,
  Package,
  ArrowLeftRight,
  Truck,
  ScanBarcode,
  UserCheck,
  Building,
  History,
  TrendingUp,
  ClipboardCheck,
  FileSpreadsheet,
  BellRing,
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  isCollapsed,
  onToggle,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const role = (session?.user as any)?.role;
  const userPermissionsRaw = (session?.user as any)?.permissions;

  let allowedPermissions: string[] = ['dashboard', 'prices', 'stocks', 'transactions', 'suppliers', 'customers', 'z-report', 'balance-sheet', 'stock-audit', 'data-hub', 'alerts', 'logs', 'price-check', 'users'];
  if (role !== 'SUPER_ADMIN' && userPermissionsRaw) {
    try {
      allowedPermissions = typeof userPermissionsRaw === 'string' ? JSON.parse(userPermissionsRaw) : userPermissionsRaw;
    } catch (e) {
      allowedPermissions = ['dashboard', 'prices', 'stocks', 'transactions', 'suppliers', 'customers', 'z-report', 'balance-sheet', 'stock-audit', 'data-hub', 'alerts', 'logs', 'price-check', 'users'];
    }
  }

  // "İşlem Logları" (logs) sayfasını SADECE Bayi Yetkilisi (ADMIN) veya SUPER_ADMIN görebilir
  const isDealerAdminOrSuper = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const visibleMenuItems = MENU_ITEMS.filter(item => {
    if (item.id === 'logs' && !isDealerAdminOrSuper) return false;
    return allowedPermissions.includes(item.id);
  });

  return (
    <>
      {/* Mobil Backdrop Karartma */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Ana Kenar Çubuğu (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-slate-900/95 backdrop-blur-2xl border-r border-amber-500/15 flex flex-col z-50 transition-all duration-300 ${
          isMobileOpen
            ? 'translate-x-0 w-64 shadow-2xl shadow-black/80'
            : '-translate-x-full md:translate-x-0 ' + (isCollapsed ? 'md:w-16' : 'md:w-64')
        }`}
      >
        {/* Brand */}
        <div className="px-5 py-4 sm:py-5 text-lg sm:text-xl font-extrabold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent border-b border-amber-500/15 flex items-center justify-between">
          <span className="truncate tracking-tight">{MESSAGES.APP_NAME}</span>
          
          <div className="flex items-center gap-1">
            {/* Desktop Kolay Daraltma Butonu */}
            <button
              onClick={onToggle}
              className="hidden md:flex p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
              title={isCollapsed ? 'Genişlet' : 'Daralt'}
            >
              {isCollapsed ? <Menu size={18} className="text-amber-400" /> : <ChevronLeft size={16} />}
            </button>

            {/* Mobil Drawer Kapatma Butonu */}
            <button
              onClick={onCloseMobile}
              className="flex md:hidden p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
              title="Menüyü Kapat"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className={THEME.SIDEBAR.NAV}>
          {visibleMenuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = iconMap[item.icon];
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => {
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={`${THEME.SIDEBAR.LINK} ${
                  isActive ? THEME.SIDEBAR.LINK_ACTIVE : THEME.SIDEBAR.LINK_INACTIVE
                } ${isCollapsed ? 'md:justify-center md:px-0' : ''} min-h-[44px]`}
              >
                {Icon && <Icon className={`w-5 h-5 flex-shrink-0 ${isCollapsed ? 'md:mr-0 mr-3' : 'mr-3'}`} />}
                <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className={THEME.SIDEBAR.FOOTER}>
          <div className={`text-[10px] text-gray-500 font-mono text-center ${isCollapsed ? 'md:hidden' : ''}`}>
            {MESSAGES.APP_NAME} v1.0
          </div>
        </div>
      </aside>
    </>
  );
}
