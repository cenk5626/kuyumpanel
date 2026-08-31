'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Search,
  ShieldAlert,
  Filter,
  User,
  Calendar,
  RefreshCw,
  AlertTriangle,
  FileEdit,
  Trash2,
  CheckCircle,
  Eye,
  ArrowRight,
  Sparkles,
  DollarSign,
  Layers,
  Coins
} from 'lucide-react';
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

interface SuspiciousTransactionItem {
  id: string;
  type: string;
  productType: string;
  productCode: string;
  quantity: number;
  price: number;
  total: number;
  profitAmount: number | null;
  profitMargin: number | null;
  paymentMethod: string;
  suspiciousReason: string;
  employeeName: string;
  createdAt: string;
}

interface RevisionLogItem {
  id: string;
  transactionId: string;
  actionType: string;
  previousData: any;
  newData: any;
  reason: string;
  userEmail: string | null;
  userName: string | null;
  createdAt: string;
}

interface LogsClientProps {
  initialLogs: AuditLogItem[];
  initialSuspicious: SuspiciousTransactionItem[];
  initialRevisions: RevisionLogItem[];
  currentUserRole: string;
}

const ACTION_COLOR_MAP: Record<string, string> = {
  'POS Alış İşlemi': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'POS Satış İşlemi': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Stok Güncelleme': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'Stok Tanımlama': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  'Toptancı Virman İşlemi': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Toptancı Mal Alımı': 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'Müşteri Borç Verme': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'Müşteri Tahsilat Alma': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Müşteri Kaydı': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'İşlem Düzenleme': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'İşlem İptali / Silme': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export default function LogsClient({
  initialLogs,
  initialSuspicious,
  initialRevisions,
  currentUserRole,
}: LogsClientProps) {
  const [activeTab, setActiveTab] = useState<'audit' | 'suspicious' | 'revisions'>('audit');
  const [logs, setLogs] = useState<AuditLogItem[]>(initialLogs);
  const [suspiciousList, setSuspiciousList] = useState<SuspiciousTransactionItem[]>(initialSuspicious);
  const [revisionsList, setRevisionsList] = useState<RevisionLogItem[]>(initialRevisions);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Detay Modalı
  const [viewRevisionModal, setViewRevisionModal] = useState<RevisionLogItem | null>(null);

  const isAdmin = currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN';

  // Veri Yenileme
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [logsRes, txRes, revRes] = await Promise.all([
        fetch('/api/logs'),
        fetch('/api/transactions?suspicious=true'),
        fetch('/api/transactions/revisions'),
      ]);
      if (logsRes.ok) setLogs(await logsRes.json());
      if (txRes.ok) {
        const txs = await txRes.json();
        setSuspiciousList(txs.map((tx: any) => ({
          id: tx.id,
          type: tx.type,
          productType: tx.productType,
          productCode: tx.productCode,
          quantity: tx.quantity,
          price: tx.price,
          total: tx.total,
          profitAmount: tx.profitAmount ?? null,
          profitMargin: tx.profitMargin ?? null,
          paymentMethod: tx.paymentMethod,
          suspiciousReason: tx.suspiciousReason ?? 'Belirtilmemiş',
          employeeName: tx.employeeName ?? 'Genel',
          createdAt: tx.createdAt,
        })));
      }
      if (revRes.ok) setRevisionsList(await revRes.json());
    } catch {
      /* quiet */
    } finally {
      setLoading(false);
    }
  };

  // Filtrelenmiş Audit Logs
  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
      (log.userName && log.userName.toLowerCase().includes(q));

    const matchesAction = selectedAction === 'ALL' || log.action.includes(selectedAction);

    return matchesSearch && matchesAction;
  });

  // Filtrelenmiş Şüpheli İşlemler
  const filteredSuspicious = suspiciousList.filter((tx) => {
    const q = searchQuery.toLowerCase();
    return (
      tx.productCode.toLowerCase().includes(q) ||
      tx.suspiciousReason.toLowerCase().includes(q) ||
      tx.employeeName.toLowerCase().includes(q) ||
      tx.paymentMethod.toLowerCase().includes(q)
    );
  });

  // Filtrelenmiş Revizyonlar
  const filteredRevisions = revisionsList.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      r.reason.toLowerCase().includes(q) ||
      r.actionType.toLowerCase().includes(q) ||
      (r.userName && r.userName.toLowerCase().includes(q)) ||
      r.transactionId.toLowerCase().includes(q)
    );
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
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
            <History className="text-yellow-400" size={28} />
            İşlem Logları & Güvenlik Radarı
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            Sistem denetim günlüğü, yapay zeka şüpheli işlem radarı ve değiştirilen/silinen işlem revizyon takibi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`${THEME.BTN_SECONDARY} gap-2 text-xs min-h-[40px]`}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
          <HeaderActions />
        </div>
      </div>

      {/* 3'lü TAB SEÇİCİ */}
      <div className="flex flex-col sm:flex-row bg-gray-900/80 p-1.5 rounded-2xl border border-gray-800/80 max-w-2xl backdrop-blur-md gap-1">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
            activeTab === 'audit'
              ? 'bg-yellow-500 text-gray-950 shadow-lg shadow-yellow-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <History size={15} /> 1. Sistem Logları ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('suspicious')}
          className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
            activeTab === 'suspicious'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
              : 'text-gray-400 hover:text-red-400'
          }`}
        >
          <AlertTriangle size={15} /> 2. Şüpheli İşlem Radarı ({suspiciousList.length})
        </button>
        <button
          onClick={() => setActiveTab('revisions')}
          className={`flex-1 py-2.5 sm:py-3 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all min-h-[44px] ${
            activeTab === 'revisions'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'text-gray-400 hover:text-purple-300'
          }`}
        >
          <FileEdit size={15} /> 3. Düzeltme & Silme ({revisionsList.length})
        </button>
      </div>

      {/* Arama ve Filtre */}
      <div className={`${THEME.GLASS_CARD} p-4 flex flex-col sm:flex-row gap-3 items-center justify-between`}>
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'audit'
                ? 'İşlem türü, açıklama veya personel ara...'
                : activeTab === 'suspicious'
                ? 'Ürün kodu, şüphe gerekçesi veya personel ara...'
                : 'Revizyon gerekçesi, işlem no veya kullanıcı ara...'
            }
            className={`${THEME.INPUT} pl-10 text-xs py-2.5`}
          />
        </div>

        {activeTab === 'audit' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className={`${THEME.SELECT} text-xs py-2.5 w-full sm:w-48`}
            >
              <option value="ALL">Tüm İşlem Tipleri</option>
              <option value="POS">POS Alış / Satış</option>
              <option value="Stok">Stok Güncelleme</option>
              <option value="Müşteri">Müşteri & Borç İşlemleri</option>
              <option value="Toptancı">Toptancı / Virman</option>
              <option value="İşlem">Düzenleme & Silme</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: SİSTEM AUDIT LOGLARI */}
      {activeTab === 'audit' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${THEME.GLASS_CARD} overflow-hidden`}
        >
          <div className={THEME.TABLE.WRAPPER}>
            <table className={THEME.TABLE.MAIN}>
              <thead className={THEME.TABLE.THEAD}>
                <tr>
                  <th className={THEME.TABLE.TH}>Tarih & Saat</th>
                  <th className={THEME.TABLE.TH}>İşlem Türü</th>
                  <th className={THEME.TABLE.TH}>İşlemi Yapan</th>
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
                        transition={{ delay: i * 0.01 }}
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
                              <span className="text-xs font-medium text-white block">{log.userName || 'Sistem'}</span>
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
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm">
                      Kayıtlı sistem logu bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB 2: ŞÜPHELİ İŞLEMLER RADARI */}
      {activeTab === 'suspicious' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${THEME.GLASS_CARD} overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-red-500/20 bg-red-500/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
              <ShieldAlert size={18} />
              Otomatik Güvenlik & Anomali Radarı
            </div>
            <span className="text-xs text-gray-400 font-mono">
              Yüksek Tutar, Gece İşlemleri, Olağandışı Fiyat Sapmaları ve Borç Limiti Aşımı
            </span>
          </div>

          <div className={THEME.TABLE.WRAPPER}>
            <table className={THEME.TABLE.MAIN}>
              <thead className={THEME.TABLE.THEAD}>
                <tr>
                  <th className={THEME.TABLE.TH}>Tarih & Saat</th>
                  <th className={THEME.TABLE.TH}>İşlem & Ürün</th>
                  <th className={THEME.TABLE.TH}>Tutar & Ödeme</th>
                  <th className={THEME.TABLE.TH}>Kâr / Marj</th>
                  <th className={THEME.TABLE.TH}>Tespit Edilen Şüphe & Risk Nedeni</th>
                  <th className={THEME.TABLE.TH}>Personel</th>
                </tr>
              </thead>
              <tbody className={THEME.TABLE.TBODY}>
                {filteredSuspicious.length > 0 ? (
                  filteredSuspicious.map((tx, i) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-red-500/5 transition-colors border-b border-gray-800/40"
                    >
                      <td className={THEME.TABLE.TD}>
                        <div className="text-xs font-mono text-gray-300">
                          {new Date(tx.createdAt).toLocaleString('tr-TR')}
                        </div>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            tx.type === 'buy'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {tx.type === 'buy' ? 'ALIŞ' : 'SATIŞ'}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white block">{tx.productCode}</span>
                            <span className="text-[10px] text-gray-400">{tx.quantity} Adet / gr</span>
                          </div>
                        </div>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <div>
                          <span className="text-sm font-bold text-white font-mono block">
                            ₺{tx.total.toLocaleString('tr-TR')}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            Ödeme: {tx.paymentMethod}
                          </span>
                        </div>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        {tx.profitAmount != null ? (
                          <div>
                            <span className={`text-xs font-bold font-mono ${tx.profitAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {tx.profitAmount >= 0 ? `+₺${tx.profitAmount.toLocaleString('tr-TR')}` : `-₺${Math.abs(tx.profitAmount).toLocaleString('tr-TR')}`}
                            </span>
                            {tx.profitMargin != null && (
                              <span className="text-[10px] text-gray-500 block">
                                Marj: %{tx.profitMargin.toFixed(1)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">—</span>
                        )}
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-semibold flex items-start gap-2 max-w-md">
                          <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                          <span>{tx.suspiciousReason}</span>
                        </div>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <span className="text-xs font-medium text-gray-300">{tx.employeeName}</span>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500 text-sm">
                      <CheckCircle size={36} className="mx-auto text-emerald-400 mb-2 opacity-80" />
                      Harika! Sistemde tespit edilen şüpheli veya kural dışı işlem kaydı bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB 3: İŞLEM REVİZYON & SİLME GEÇMİŞİ */}
      {activeTab === 'revisions' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${THEME.GLASS_CARD} overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-purple-300 font-bold text-sm">
              <FileEdit size={18} />
              İşlem Düzenleme & Silme Revizyon Günlüğü
            </div>
            <span className="text-xs text-gray-400 font-mono">
              Düzenlenen ve iptal edilen işlemlerin kim tarafından hangi gerekçeyle değiştirildiği
            </span>
          </div>

          <div className={THEME.TABLE.WRAPPER}>
            <table className={THEME.TABLE.MAIN}>
              <thead className={THEME.TABLE.THEAD}>
                <tr>
                  <th className={THEME.TABLE.TH}>Değişiklik Tarihi</th>
                  <th className={THEME.TABLE.TH}>Eylem</th>
                  <th className={THEME.TABLE.TH}>İşlem No & Ürün</th>
                  <th className={THEME.TABLE.TH}>Düzeltme / Silme Gerekçesi</th>
                  <th className={THEME.TABLE.TH}>Yetkili Personel</th>
                  <th className={THEME.TABLE.TH}>Karşılaştırma</th>
                </tr>
              </thead>
              <tbody className={THEME.TABLE.TBODY}>
                {filteredRevisions.length > 0 ? (
                  filteredRevisions.map((rev, i) => (
                    <motion.tr
                      key={rev.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={THEME.TABLE.TR}
                    >
                      <td className={THEME.TABLE.TD}>
                        <div className="text-xs font-mono text-gray-300">
                          {new Date(rev.createdAt).toLocaleString('tr-TR')}
                        </div>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          rev.actionType === 'DELETE'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                        }`}>
                          {rev.actionType === 'DELETE' ? '🗑️ İŞLEM SİLİNDİ' : '✏️ DÜZENLENDİ'}
                        </span>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <div>
                          <span className="text-xs font-bold text-white block">
                            #{rev.transactionId.slice(-8)}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {rev.previousData?.productCode || 'Ürün'} ({rev.previousData?.quantity || 0} Adet)
                          </span>
                        </div>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <span className="text-xs text-yellow-300/90 font-medium whitespace-normal max-w-sm block">
                          "{rev.reason}"
                        </span>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <div className="text-xs font-medium text-gray-300">
                          {rev.userName || rev.userEmail || 'Yönetici'}
                        </div>
                      </td>
                      <td className={THEME.TABLE.TD}>
                        <button
                          onClick={() => setViewRevisionModal(rev)}
                          className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                        >
                          <Eye size={13} /> İncele (Diff)
                        </button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500 text-sm">
                      Henüz geçmiş işlem düzenleme veya silme kaydı bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ─── REVİZYON DETAY & FARKLILIK (DIFF) MODALI ─── */}
      <AnimatePresence>
        {viewRevisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileEdit className="text-purple-400" size={20} />
                    İşlem Revizyon Karşılaştırması
                  </h3>
                  <p className="text-xs text-purple-300 font-mono mt-0.5">
                    İşlem No: #{viewRevisionModal.transactionId} | Eylem: {viewRevisionModal.actionType}
                  </p>
                </div>
                <button onClick={() => setViewRevisionModal(null)} className={THEME.BTN_ICON}>
                  <X size={18} />
                </button>
              </div>

              {/* Gerekçe Kartı */}
              <div className="p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider block">
                  Düzeltme / Silme Gerekçesi
                </span>
                <p className="text-sm text-gray-200 font-medium">"{viewRevisionModal.reason}"</p>
                <div className="text-[10px] text-gray-400 flex items-center gap-2 pt-1 font-mono">
                  <span>Yapan: {viewRevisionModal.userName || viewRevisionModal.userEmail}</span>
                  <span>•</span>
                  <span>Tarih: {new Date(viewRevisionModal.createdAt).toLocaleString('tr-TR')}</span>
                </div>
              </div>

              {/* Eski vs Yeni Karşılaştırma */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Eski Hali */}
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-red-400 uppercase flex items-center gap-1.5">
                    <History size={14} /> Önceki Hali (Değişmeden Önce)
                  </h4>
                  {viewRevisionModal.previousData ? (
                    <div className="space-y-1 text-xs font-mono text-gray-300">
                      <div><strong className="text-gray-400">Ürün:</strong> {viewRevisionModal.previousData.productCode}</div>
                      <div><strong className="text-gray-400">Miktar:</strong> {viewRevisionModal.previousData.quantity}</div>
                      <div><strong className="text-gray-400">Birim Fiyat:</strong> ₺{viewRevisionModal.previousData.price?.toLocaleString('tr-TR')}</div>
                      <div><strong className="text-gray-400">Toplam:</strong> ₺{viewRevisionModal.previousData.total?.toLocaleString('tr-TR')}</div>
                      <div><strong className="text-gray-400">Ödeme:</strong> {viewRevisionModal.previousData.paymentMethod}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-xs">Veri bulunamadı.</span>
                  )}
                </div>

                {/* Yeni Hali */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                    <CheckCircle size={14} /> Yeni Hali (Düzeltme Sonrası)
                  </h4>
                  {viewRevisionModal.newData ? (
                    <div className="space-y-1 text-xs font-mono text-gray-300">
                      <div><strong className="text-gray-400">Ürün:</strong> {viewRevisionModal.newData.productCode}</div>
                      <div><strong className="text-gray-400">Miktar:</strong> {viewRevisionModal.newData.quantity}</div>
                      <div><strong className="text-gray-400">Birim Fiyat:</strong> ₺{viewRevisionModal.newData.price?.toLocaleString('tr-TR')}</div>
                      <div><strong className="text-gray-400">Toplam:</strong> ₺{viewRevisionModal.newData.total?.toLocaleString('tr-TR')}</div>
                      <div><strong className="text-gray-400">Ödeme:</strong> {viewRevisionModal.newData.paymentMethod}</div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-500/10 rounded-lg text-red-400 text-xs font-semibold">
                      İşlem silindiği / iptal edildiği için yeni durum kaydı bulunmamaktadır. Stok miktarı otomatik olarak geri iade edilmiştir.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewRevisionModal(null)}
                  className={THEME.BTN_PRIMARY}
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
