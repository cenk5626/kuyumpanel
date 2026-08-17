'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Users, LogOut, Activity, ChevronLeft, Menu, Package, ArrowLeftRight, Truck, ScanBarcode, UserCheck, History, Building } from 'lucide-react';
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
};

export default function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const role = (session?.user as any)?.role;
  const userPermissionsRaw = (session?.user as any)?.permissions;

  let allowedPermissions: string[] = ['dashboard', 'prices', 'stocks', 'transactions', 'suppliers', 'customers', 'z-report', 'logs', 'price-check', 'users'];
  if (role !== 'SUPER_ADMIN' && userPermissionsRaw) {
    try {
      allowedPermissions = typeof userPermissionsRaw === 'string' ? JSON.parse(userPermissionsRaw) : userPermissionsRaw;
    } catch (e) {
      allowedPermissions = ['dashboard', 'prices', 'stocks', 'transactions', 'suppliers', 'customers', 'z-report', 'logs', 'price-check', 'users'];
    }
  }

  // "İşlem Logları" (logs) sayfasını SADECE Bayi Yetkilisi (ADMIN) veya SUPER_ADMIN görebilir
  const isDealerAdminOrSuper = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const visibleMenuItems = MENU_ITEMS.filter(item => {
    if (item.id === 'logs' && !isDealerAdminOrSuper) return false;
    return allowedPermissions.includes(item.id);
  });

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-gray-900/95 backdrop-blur-xl border-r border-yellow-900/20 flex flex-col z-50 transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Brand */}
      <div className="px-6 py-5 text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent border-b border-yellow-900/20 flex items-center justify-between">
        {!isCollapsed ? (
          <>
            <span className="truncate">{MESSAGES.APP_NAME}</span>
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Menu size={18} className="text-yellow-500" />
            </button>
          </div>
        )}
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
              title={isCollapsed ? item.label : undefined}
              className={`${THEME.SIDEBAR.LINK} ${isActive ? THEME.SIDEBAR.LINK_ACTIVE : THEME.SIDEBAR.LINK_INACTIVE} ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              {Icon && <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />}
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className={THEME.SIDEBAR.FOOTER}>
        {!isCollapsed && (
          <div className="text-[10px] text-gray-500 font-mono text-center">
            {MESSAGES.APP_NAME} v1.0
          </div>
        )}
      </div>
    </aside>
  );
}
