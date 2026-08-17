import { ROUTES } from './routes';
import { MESSAGES } from './messages';

export const MENU_ITEMS = [
  {
    id: 'dashboard',
    label: MESSAGES.MENU_DASHBOARD,
    href: ROUTES.DASHBOARD,
    icon: 'LayoutDashboard',
  },
  {
    id: 'prices',
    label: MESSAGES.MENU_PRICES,
    href: ROUTES.PRICES,
    icon: 'Activity',
  },
  {
    id: 'stocks',
    label: MESSAGES.MENU_STOCKS,
    href: ROUTES.STOCKS,
    icon: 'Package',
  },
  {
    id: 'transactions',
    label: MESSAGES.MENU_TRANSACTIONS,
    href: ROUTES.TRANSACTIONS,
    icon: 'ArrowLeftRight',
  },
  {
    id: 'suppliers',
    label: MESSAGES.MENU_SUPPLIERS,
    href: ROUTES.SUPPLIERS,
    icon: 'Truck',
  },
  {
    id: 'customers',
    label: MESSAGES.MENU_CUSTOMERS,
    href: ROUTES.CUSTOMERS,
    icon: 'UserCheck',
  },
  {
    id: 'z-report',
    label: MESSAGES.MENU_Z_REPORT,
    href: ROUTES.Z_REPORT,
    icon: 'Building',
  },
  {
    id: 'logs',
    label: MESSAGES.MENU_LOGS,
    href: ROUTES.LOGS,
    icon: 'History',
  },
  {
    id: 'price-check',
    label: MESSAGES.MENU_PRICE_CHECK,
    href: ROUTES.PRICE_CHECK,
    icon: 'ScanBarcode',
  },
  {
    id: 'users',
    label: MESSAGES.MENU_USERS,
    href: ROUTES.USERS,
    icon: 'Users',
  },
] as const;
