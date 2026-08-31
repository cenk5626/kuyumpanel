'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Building2, Users, Shield, CheckSquare, Square } from 'lucide-react';
import { MESSAGES } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';
import { THEME, ANIM } from '@/constants/theme';
import { USER_ROLES } from '@/constants/roles';
import HeaderActions from '@/components/HeaderActions';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string;
  dealerId: string | null;
  dealerName: string;
  createdAt: string;
}

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: '📊 Dashboard (Ana Sayfa)', desc: 'Genel bakış & istatistikler' },
  { id: 'prices', label: '📈 Canlı Fiyat Ekranı', desc: 'Canlı altın ve ziynet fiyatları' },
  { id: 'stocks', label: '📦 Stok Takip', desc: 'Barkodlu takı ve stok yönetimi' },
  { id: 'transactions', label: '🔄 Alış / Satış (POS)', desc: 'Perakende & sarrafiye alış satış' },
  { id: 'suppliers', label: '🚚 Toptancı & Mutabakat', desc: 'Mal alımı ve cari hesap takibi' },
  { id: 'customers', label: '👤 Müşteriler & Borç Takip', desc: 'Müşteri rehberi ve veresiye takibi' },
  { id: 'logs', label: '📜 İşlem Logları', desc: 'Sistem denetim & işlem geçmişi (Sadece Admin)' },
  { id: 'price-check', label: '🏷️ Fiyat Gör Kiosk', desc: 'Müşteri fiyat sorgulama ekranı' },
  { id: 'users', label: '👥 Kullanıcı Yönetimi', desc: 'Kullanıcı tanımlama ve izinler' },
];

interface Employee {
  id: string;
  name: string;
  dealerId: string;
  dealerName: string;
  createdAt: string;
}

interface Dealer {
  id: string;
  name: string;
}

interface UsersClientProps {
  initialUsers: User[];
  initialEmployees: Employee[];
  dealers: Dealer[];
  currentUserRole: string;
  currentUserDealerId: string | null;
}

const ROLE_BADGE_MAP: Record<string, string> = {
  [USER_ROLES.SUPER_ADMIN]: THEME.BADGE_SUPER_ADMIN,
  [USER_ROLES.ADMIN]: THEME.BADGE_ADMIN,
  [USER_ROLES.TABLET]: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold',
  [USER_ROLES.PC]: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full text-xs font-bold',
  [USER_ROLES.USER]: THEME.BADGE_USER,
};

const ROLE_LABEL_MAP: Record<string, string> = {
  [USER_ROLES.SUPER_ADMIN]: MESSAGES.ROLE_SUPER_ADMIN,
  [USER_ROLES.ADMIN]: 'Bayi Yetkilisi',
  [USER_ROLES.TABLET]: 'Tablet Kullanıcısı',
  [USER_ROLES.PC]: 'Bilgisayar Kullanıcısı',
  [USER_ROLES.USER]: MESSAGES.ROLE_USER,
};

type ActiveTab = 'users' | 'dealers' | 'employees';

export default function UsersClient({ initialUsers, initialEmployees, dealers: initialDealers, currentUserRole, currentUserDealerId }: UsersClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [dealers, setDealers] = useState<Dealer[]>(initialDealers);

  // User form modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: USER_ROLES.ADMIN as string,
    dealerId: '',
    permissions: AVAILABLE_PAGES.map(p => p.id),
  });

  // Employee form modal states
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    dealerId: '',
  });

  // Dealer form modal states
  const [showDealerModal, setShowDealerModal] = useState(false);
  const [dealerFormData, setDealerFormData] = useState({ name: '' });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = currentUserRole === USER_ROLES.SUPER_ADMIN;

  const resetUserForm = () => {
    setUserFormData({
      name: '',
      email: '',
      password: '',
      role: USER_ROLES.ADMIN,
      dealerId: '',
      permissions: AVAILABLE_PAGES.map(p => p.id),
    });
    setEditingUser(null);
    setError('');
  };

  const resetEmployeeForm = () => {
    setEmployeeFormData({
      name: '',
      dealerId: currentUserDealerId || '',
    });
    setEditingEmployee(null);
    setError('');
  };

  const resetDealerForm = () => {
    setDealerFormData({ name: '' });
    setError('');
  };

  const openAddUser = () => {
    resetUserForm();
    setShowUserModal(true);
  };

  const openAddEmployee = () => {
    resetEmployeeForm();
    setShowEmployeeModal(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeFormData({
      name: emp.name,
      dealerId: emp.dealerId,
    });
    setError('');
    setShowEmployeeModal(true);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);

    let perms = AVAILABLE_PAGES.map(p => p.id);
    if (user.permissions) {
      try {
        perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
      } catch (e) {
        perms = AVAILABLE_PAGES.map(p => p.id);
      }
    }

    setUserFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      dealerId: user.dealerId || '',
      permissions: perms,
    });
    setError('');
    setShowUserModal(true);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (editingUser) {
        // Update
        const res = await fetch(ROUTES.API_USERS, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingUser.id, ...userFormData }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        
        // Yeniden listeyi güncelle
        const updatedUsers = users.map((u) => 
          u.id === editingUser.id 
            ? { 
                ...data, 
                createdAt: data.createdAt, 
                dealerName: dealers.find(d => d.id === data.dealerId)?.name ?? 'Merkez'
              } 
            : u
        );
        setUsers(updatedUsers);
      } else {
        // Create
        if (!userFormData.password) { setError('Şifre zorunludur.'); return; }
        const res = await fetch(ROUTES.API_USERS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userFormData),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }
        
        setUsers([...users, { 
          ...data, 
          createdAt: data.createdAt,
          dealerName: dealers.find(d => d.id === data.dealerId)?.name ?? 'Merkez'
        }]);
      }
      setShowUserModal(false);
      resetUserForm();
      router.refresh();
    } catch {
      setError(MESSAGES.LOGIN_ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  const handleUserDelete = async (user: User) => {
    if (user.role === USER_ROLES.SUPER_ADMIN) {
      alert(MESSAGES.USERS_SUPER_ADMIN_NO_DELETE);
      return;
    }
    if (!confirm(MESSAGES.USERS_DELETE_CONFIRM)) return;

    try {
      const res = await fetch(`${ROUTES.API_USERS}?id=${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setUsers(users.filter((u) => u.id !== user.id));
      router.refresh();
    } catch {
      alert(MESSAGES.LOGIN_ERROR_GENERIC);
    }
  };

  const handleDealerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(ROUTES.API_DEALERS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealerFormData),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      setDealers([...dealers, data]);
      setShowDealerModal(false);
      resetDealerForm();
      router.refresh();
    } catch {
      setError('Bayi kaydedilirken ağ hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (editingEmployee) {
        // Update
        const res = await fetch('/api/employees', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingEmployee.id, ...employeeFormData }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }

        setEmployees(employees.map(emp => 
          emp.id === editingEmployee.id
            ? {
                ...data,
                dealerName: dealers.find(d => d.id === data.dealerId)?.name ?? 'Merkez'
              }
            : emp
        ));
      } else {
        // Create
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employeeFormData),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error); return; }

        setEmployees([...employees, {
          ...data,
          dealerName: dealers.find(d => d.id === data.dealerId)?.name ?? 'Merkez'
        }]);
      }
      setShowEmployeeModal(false);
      resetEmployeeForm();
      router.refresh();
    } catch {
      setError('İşlem gerçekleştirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeDelete = async (emp: Employee) => {
    if (!confirm('Bu çalışanı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/employees?id=${emp.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setEmployees(employees.filter(e => e.id !== emp.id));
      router.refresh();
    } catch {
      alert('Çalışan silinirken bir hata oluştu.');
    }
  };

  return (
    <>
      {/* Header */}
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <motion.h1 {...ANIM.FADE_UP} transition={{ duration: ANIM.DURATION.NORMAL }} className={THEME.HEADER_TITLE}>
            Yetki & Bayi Yönetim Paneli
          </motion.h1>
          
          <div className="flex gap-2">
            {activeTab === 'users' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={openAddUser}
                className={THEME.BTN_PRIMARY}
              >
                <Plus size={18} className="mr-2" />
                Yeni Kullanıcı Ekle
              </motion.button>
            )}
            {activeTab === 'dealers' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowDealerModal(true)}
                className={THEME.BTN_PRIMARY}
              >
                <Plus size={18} className="mr-2" />
                Yeni Bayi Ekle
              </motion.button>
            )}
            {activeTab === 'employees' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={openAddEmployee}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center transition-all shadow-lg shadow-emerald-500/10 animate-fade-in"
              >
                <Plus size={18} className="mr-2 text-black" />
                Yeni Çalışan Ekle
              </motion.button>
            )}
            <HeaderActions />
          </div>
        </div>
      </header>

      {/* Tabs */}
      {(isSuperAdmin || currentUserRole === USER_ROLES.ADMIN) && (
        <div className="px-3.5 sm:px-6 pt-4 sm:pt-6 flex gap-3 border-b border-gray-800/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-yellow-500 text-yellow-500'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Users size={16} /> Kullanıcı Yönetimi
          </button>
          
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('dealers')}
              className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'dealers'
                  ? 'border-yellow-500 text-yellow-500'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Building2 size={16} /> Bayi (Kuyumcu) Listesi
            </button>
          )}

          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'employees'
                ? 'border-yellow-500 text-yellow-500'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Users size={16} className="text-emerald-400" /> Çalışan Listesi (Fiş için)
          </button>
        </div>
      )}

      {/* Content wrapper */}
      <div className={THEME.PAGE_WRAPPER}>
        {activeTab === 'users' ? (
          /* ─── KULLANICI LİSTESİ ─── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: ANIM.DURATION.NORMAL }}
            className={`${THEME.GLASS_CARD} overflow-hidden`}
          >
            <div className={THEME.TABLE.WRAPPER}>
              <table className={THEME.TABLE.MAIN}>
                <thead className={THEME.TABLE.THEAD}>
                  <tr>
                    <th className={THEME.TABLE.TH}>{MESSAGES.USERS_TABLE_NAME}</th>
                    <th className={THEME.TABLE.TH}>{MESSAGES.USERS_TABLE_EMAIL}</th>
                    <th className={THEME.TABLE.TH}>Bayi (Grup)</th>
                    <th className={THEME.TABLE.TH}>{MESSAGES.USERS_TABLE_ROLE}</th>
                    <th className={THEME.TABLE.TH}>Sayfa İzinleri</th>
                    <th className={THEME.TABLE.TH}>{MESSAGES.USERS_TABLE_DATE}</th>
                    <th className={THEME.TABLE.TH}>{MESSAGES.USERS_TABLE_ACTIONS}</th>
                  </tr>
                </thead>
                <tbody className={THEME.TABLE.TBODY}>
                  {users.length > 0 ? (
                    users.map((user, i) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={THEME.TABLE.TR}
                      >
                        <td className={THEME.TABLE.TD}>
                          <span className="font-medium text-white">{user.name}</span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className={THEME.TEXT_SECONDARY}>{user.email}</span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className="text-gray-300 text-xs px-2.5 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
                            {user.dealerName}
                          </span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className={ROLE_BADGE_MAP[user.role] || THEME.BADGE_USER}>
                            {ROLE_LABEL_MAP[user.role] || user.role}
                          </span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          {user.role === USER_ROLES.SUPER_ADMIN ? (
                            <span className="text-[11px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                              Tüm Sayfalar (Tam Yetki)
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 flex-wrap max-w-[220px]">
                              {(() => {
                                let perms: string[] = AVAILABLE_PAGES.map(p => p.id);
                                if (user.permissions) {
                                  try {
                                    perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
                                  } catch (e) {
                                    perms = AVAILABLE_PAGES.map(p => p.id);
                                  }
                                }
                                return perms.map(pId => (
                                  <span key={pId} className="text-[10px] font-semibold bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded border border-gray-700/60">
                                    {AVAILABLE_PAGES.find(p => p.id === pId)?.label.split(' ')[1] || pId}
                                  </span>
                                ));
                              })()}
                            </div>
                          )}
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className={THEME.TEXT_SECONDARY}>
                            {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditUser(user)} className={THEME.BTN_ICON} title="Düzenle">
                              <Pencil size={16} />
                            </button>
                            {user.role !== USER_ROLES.SUPER_ADMIN && (
                              <button onClick={() => handleUserDelete(user)} className={THEME.BTN_DANGER} title="Sil">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                        Henüz kayıtlı kullanıcı bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : activeTab === 'dealers' ? (
          /* === BAYI LISTESI === */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: ANIM.DURATION.NORMAL }}
            className={`${THEME.GLASS_CARD} overflow-hidden`}
          >
            <div className={THEME.TABLE.WRAPPER}>
              <table className={THEME.TABLE.MAIN}>
                <thead className={THEME.TABLE.THEAD}>
                  <tr>
                    <th className={THEME.TABLE.TH}>Bayi Kodu (ID)</th>
                    <th className={THEME.TABLE.TH}>Bayi Adı</th>
                    <th className={THEME.TABLE.TH}>Aktif Üyeler</th>
                  </tr>
                </thead>
                <tbody className={THEME.TABLE.TBODY}>
                  {dealers.map((dealer, i) => {
                    const memberCount = users.filter(u => u.dealerId === dealer.id).length;
                    return (
                      <motion.tr
                        key={dealer.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={THEME.TABLE.TR}
                      >
                        <td className={THEME.TABLE.TD}>
                          <span className="font-mono text-gray-400 text-xs">{dealer.id}</span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className="font-medium text-white">{dealer.name}</span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className="font-bold text-yellow-400">{memberCount} Üye</span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          /* === CALISAN LISTESI === */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: ANIM.DURATION.NORMAL }}
            className={`${THEME.GLASS_CARD} overflow-hidden`}
          >
            <div className={THEME.TABLE.WRAPPER}>
              <table className={THEME.TABLE.MAIN}>
                <thead className={THEME.TABLE.THEAD}>
                  <tr>
                    <th className={THEME.TABLE.TH}>Çalışan Ad Soyad</th>
                    <th className={THEME.TABLE.TH}>Bayi (Grup)</th>
                    <th className={THEME.TABLE.TH}>Kayıt Tarihi</th>
                    <th className={THEME.TABLE.TH}>{MESSAGES.USERS_TABLE_ACTIONS}</th>
                  </tr>
                </thead>
                <tbody className={THEME.TABLE.TBODY}>
                  {employees.length > 0 ? (
                    employees.map((emp, i) => (
                      <motion.tr
                        key={emp.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={THEME.TABLE.TR}
                      >
                        <td className={THEME.TABLE.TD}>
                          <span className="font-medium text-white">{emp.name}</span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className="text-gray-300 text-xs px-2.5 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50">
                            {emp.dealerName}
                          </span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className={THEME.TEXT_SECONDARY}>
                            {new Date(emp.createdAt).toLocaleDateString('tr-TR')}
                          </span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEditEmployee(emp)} className={THEME.BTN_ICON} title="Düzenle">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleEmployeeDelete(emp)} className={THEME.BTN_DANGER} title="Sil">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                        Henüz kayıtlı çalışan bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      {/* ─── KULLANICI OLUŞTURMA/DÜZENLEME MODALI ─── */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`${THEME.GLASS_CARD} w-full max-w-md p-8 mx-4`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingUser ? MESSAGES.USER_FORM_EDIT_TITLE : MESSAGES.USER_FORM_ADD_TITLE}
                </h2>
                <button onClick={() => setShowUserModal(false)} className={THEME.BTN_ICON}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div>
                  <label htmlFor="user-name" className={THEME.LABEL}>{MESSAGES.USER_FORM_NAME}</label>
                  <input
                    id="user-name"
                    type="text"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                    required
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label htmlFor="user-email" className={THEME.LABEL}>{MESSAGES.USER_FORM_EMAIL}</label>
                  <input
                    id="user-email"
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    required
                    className={THEME.INPUT}
                  />
                </div>

                <div>
                  <label htmlFor="user-password" className={THEME.LABEL}>
                    {MESSAGES.USER_FORM_PASSWORD}
                    {editingUser && (
                      <span className="text-xs text-gray-500 ml-2">{MESSAGES.USER_FORM_PASSWORD_HINT}</span>
                    )}
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    required={!editingUser}
                    className={THEME.INPUT}
                  />
                </div>

                {isSuperAdmin && (
                  <div>
                    <label htmlFor="user-dealer" className={THEME.LABEL}>Bağlı Olduğu Bayi</label>
                    <select
                      id="user-dealer"
                      value={userFormData.dealerId}
                      onChange={(e) => setUserFormData({ ...userFormData, dealerId: e.target.value })}
                      className={THEME.SELECT}
                    >
                      <option value="">Merkez (Genel)</option>
                      {dealers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label htmlFor="user-role" className={THEME.LABEL}>{MESSAGES.USER_FORM_ROLE}</label>
                  <select
                    id="user-role"
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className={THEME.SELECT}
                  >
                    <option value={USER_ROLES.ADMIN}>Bayi Yetkilisi (Yönetici)</option>
                    <option value={USER_ROLES.TABLET}>Tablet Kullanıcısı</option>
                    <option value={USER_ROLES.PC}>Bilgisayar Kullanıcısı</option>
                    {isSuperAdmin && <option value={USER_ROLES.SUPER_ADMIN}>{MESSAGES.ROLE_SUPER_ADMIN}</option>}
                  </select>
                </div>

                {/* SAYFA ERİŞİM İZİNLERİ (CHECKBOX GRUBU) */}
                <div className="bg-gray-950/60 p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield size={14} /> Sayfa Erişim İzinleri
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = userFormData.permissions.length === AVAILABLE_PAGES.length;
                        setUserFormData({
                          ...userFormData,
                          permissions: allSelected ? [] : AVAILABLE_PAGES.map(p => p.id)
                        });
                      }}
                      className="text-[10px] text-gray-400 hover:text-white underline font-medium"
                    >
                      {userFormData.permissions.length === AVAILABLE_PAGES.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {AVAILABLE_PAGES.map(page => {
                      const isChecked = userFormData.permissions.includes(page.id);
                      return (
                        <label
                          key={page.id}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all select-none ${
                            isChecked
                              ? 'bg-yellow-500/10 border-yellow-500/40 text-white'
                              : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const nextPerms = isChecked
                                ? userFormData.permissions.filter(id => id !== page.id)
                                : [...userFormData.permissions, page.id];
                              setUserFormData({ ...userFormData, permissions: nextPerms });
                            }}
                            className="w-4 h-4 rounded border-gray-700 text-yellow-500 focus:ring-yellow-500/30 accent-yellow-500 cursor-pointer"
                          />
                          <div>
                            <span className="text-xs font-bold block">{page.label}</span>
                            <span className="text-[10px] text-gray-500 block leading-tight">{page.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className={`${THEME.BTN_PRIMARY} flex-1 justify-center`}>
                    {loading ? MESSAGES.LOADING : MESSAGES.USER_FORM_SAVE}
                  </button>
                  <button type="button" onClick={() => setShowUserModal(false)} className={THEME.BTN_SECONDARY}>
                    {MESSAGES.USER_FORM_CANCEL}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── BAYİ OLUŞTURMA MODALI ─── */}
      <AnimatePresence>
        {showDealerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`${THEME.GLASS_CARD} w-full max-w-md p-8 mx-4`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Yeni Bayi Ekle</h2>
                <button onClick={() => setShowDealerModal(false)} className={THEME.BTN_ICON}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleDealerSubmit} className="space-y-4">
                <div>
                  <label htmlFor="dealer-name" className={THEME.LABEL}>Bayi Adı</label>
                  <input
                    id="dealer-name"
                    type="text"
                    placeholder="Örn: Millet Kuyumcusu"
                    value={dealerFormData.name}
                    onChange={(e) => setDealerFormData({ name: e.target.value })}
                    required
                    className={THEME.INPUT}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className={`${THEME.BTN_PRIMARY} flex-1 justify-center`}>
                    {loading ? MESSAGES.LOADING : 'Bayiyi Kaydet'}
                  </button>
                  <button type="button" onClick={() => setShowDealerModal(false)} className={THEME.BTN_SECONDARY}>
                    Vazgeç
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ÇALIŞAN OLUŞTURMA/DÜZENLEME MODALI ─── */}
      <AnimatePresence>
        {showEmployeeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`${THEME.GLASS_CARD} w-full max-w-md p-8 mx-4`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingEmployee ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}
                </h2>
                <button onClick={() => setShowEmployeeModal(false)} className={THEME.BTN_ICON}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                <div>
                  <label htmlFor="employee-name" className={THEME.LABEL}>Ad Soyad</label>
                  <input
                    id="employee-name"
                    type="text"
                    placeholder="Örn: Ahmet Yılmaz"
                    value={employeeFormData.name}
                    onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                    required
                    className={THEME.INPUT}
                  />
                </div>

                {isSuperAdmin && (
                  <div>
                    <label htmlFor="employee-dealer" className={THEME.LABEL}>Bağlı Olduğu Bayi</label>
                    <select
                      id="employee-dealer"
                      value={employeeFormData.dealerId}
                      onChange={(e) => setEmployeeFormData({ ...employeeFormData, dealerId: e.target.value })}
                      required
                      className={THEME.SELECT}
                    >
                      <option value="">Bayi Seçin</option>
                      {dealers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className={`${THEME.BTN_PRIMARY} flex-1 justify-center`}>
                    {loading ? MESSAGES.LOADING : 'Çalışanı Kaydet'}
                  </button>
                  <button type="button" onClick={() => setShowEmployeeModal(false)} className={THEME.BTN_SECONDARY}>
                    Vazgeç
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
