'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, Search, ShieldAlert, Filter, User, Calendar, RefreshCw } from 'lucide-react';
import { THEME, ANIM } from '@/constants/theme';
import HeaderActions from '@/components/HeaderActions';

interface AuditLogItem {
  id: string;
  dealerId: string;
  action: string;
  details: string;
  userEmail: string | null;
  userName: string | null;
  createdAt: string;
}

interface LogsClientProps {
  initialLogs: AuditLogItem[];
  currentUserRole: string;
}

const ACTION_COLOR_MAP: Record<string, string> = {
  'POS Alış İşlemi': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'POS Satış İşlemi': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Stok Düzeltme': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Toptancı Mal Alımı': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Müşteri Borç Verme': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Müşteri Tahsilat Alma': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Müşteri Kaydı': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  'Kullanıcı Güncelleme': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export default function LogsClient({ initialLogs, currentUserRole }: LogsClientProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const isAdmin = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN';

  // Yenileme
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {
      // quiet
    } finally {
      setLoading(false);
    }
  };

  // Filtreleme
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.userName && log.userName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesAction = selectedAction === 'ALL' || log.action.includes(selectedAction);

    return matchesSearch && matchesAction;
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-20 bg-red-500/10 border border-red-500/20 rounded-2xl">
        <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Erişim Engellendi</h2>
        <p className="text-gray-400 text-sm">
          İşlem logları ve denetim kayıtları sadece <strong>Bayi Yetkilisi (Yönetici)</strong> tarafından görüntülenebilir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <History className="text-yellow-400" size={28} />
            İşlem Logları & Sistem Denetimi
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Mağazada gerçekleştirilen tüm alım-satım, stok, müşteri ve borç hareketlerinin zaman damgalı güvenlik dökümü.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className={`${THEME.BTN_SECONDARY} gap-2 text-xs`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
          <HeaderActions />
        </div>
      </div>

      {/* Arama & Filtreleme Çubuğu */}
      <div className={`${THEME.GLASS_CARD} p-4 flex flex-col sm:flex-row gap-3 items-center justify-between`}>
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İşlem türü, açıklama veya kullanıcı ara..."
            className={`${THEME.INPUT} pl-10 text-sm py-2.5`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-gray-400" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className={`${THEME.SELECT} text-xs py-2.5 w-full sm:w-48`}
          >
            <option value="ALL">Tüm İşlem Tipleri</option>
            <option value="POS">POS Alış / Satış</option>
            <option value="Stok">Stok Düzeltme</option>
            <option value="Müşteri">Müşteri & Borç İşlemleri</option>
            <option value="Toptancı">Toptancı İşlemleri</option>
            <option value="Kullanıcı">Kullanıcı İşlemleri</option>
          </select>
        </div>
      </div>

      {/* Log Tablosu */}
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
                <th className={THEME.TABLE.TH}>Tarih & Saat</th>
                <th className={THEME.TABLE.TH}>İşlem Türü</th>
                <th className={THEME.TABLE.TH}>İşlemi Yapan Personel</th>
                <th className={THEME.TABLE.TH}>İşlem Detayı</th>
              </tr>
            </thead>
            <tbody className={THEME.TABLE.TBODY}>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log, i) => {
                  const badgeStyle = ACTION_COLOR_MAP[log.action] || 'bg-gray-800 text-gray-300 border-gray-700';
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={THEME.TABLE.TR}
                    >
                      <td className={THEME.TABLE.TD}>
                        <div className="flex items-center gap-2 text-gray-400 text-xs font-mono">
                          <Calendar size={13} className="text-yellow-500/70" />
                          {new Date(log.createdAt).toLocaleString('tr-TR')}
                        </div>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeStyle}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] text-yellow-400 font-bold">
                            {(log.userName || log.userEmail || 'P')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-medium text-white block">{log.userName || 'Bilinmeyen Kullanıcı'}</span>
                            {log.userEmail && <span className="text-[10px] text-gray-500 block">{log.userEmail}</span>}
                          </div>
                        </div>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <span className="text-xs text-gray-300 font-mono whitespace-normal max-w-xl block">
                          {log.details}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                    Kriterlere uygun herhangi bir işlem kaydı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
