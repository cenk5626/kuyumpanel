'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Bot,
  Sparkles,
  Key,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Smartphone,
  Send,
  RefreshCw,
  QrCode,
  Globe,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';
import HeaderActions from '@/components/HeaderActions';

export default function AiSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI Ayarları
  const [aiProvider, setAiProvider] = useState<'GEMINI' | 'OPENAI'>('GEMINI');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiApiKeyMasked, setGeminiApiKeyMasked] = useState<string | null>(null);
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openaiApiKeyMasked, setOpenaiApiKeyMasked] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState('gemini-2.0-flash');
  const [aiSystemPromptExtra, setAiSystemPromptExtra] = useState('');

  // WhatsApp Ayarları: 1 (Web Intent) ve 3 (QR Kod Gateway)
  const [whatsappProvider, setWhatsappProvider] = useState<'WEB_INTENT' | 'GATEWAY'>('WEB_INTENT');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [waGatewayInstanceId, setWaGatewayInstanceId] = useState('');
  const [waGatewayToken, setWaGatewayToken] = useState('');

  // Verileri Sunucudan Yükle
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/dealer/ai-settings');
        if (res.ok) {
          const data = await res.json();
          if (data.aiProvider) setAiProvider(data.aiProvider);
          if (data.aiModel) setAiModel(data.aiModel);
          if (data.aiSystemPromptExtra) setAiSystemPromptExtra(data.aiSystemPromptExtra);
          if (data.geminiApiKeyMasked) setGeminiApiKeyMasked(data.geminiApiKeyMasked);
          if (data.openaiApiKeyMasked) setOpenaiApiKeyMasked(data.openaiApiKeyMasked);

          if (data.whatsappProvider === 'GATEWAY') setWhatsappProvider('GATEWAY');
          else setWhatsappProvider('WEB_INTENT');
          if (data.whatsappPhone) setWhatsappPhone(data.whatsappPhone);
          if (data.waGatewayInstanceId) setWaGatewayInstanceId(data.waGatewayInstanceId);
        }
      } catch (err: any) {
        console.error('Ayarlar yüklenemedi:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Ayarları Kaydet
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const payload: any = {
        aiProvider,
        aiModel,
        aiSystemPromptExtra,
        whatsappProvider,
        whatsappPhone,
        waGatewayInstanceId,
      };

      // Yalnızca yeni anahtar girilmişse gönder
      if (geminiApiKey.trim()) payload.geminiApiKey = geminiApiKey.trim();
      if (openaiApiKey.trim()) payload.openaiApiKey = openaiApiKey.trim();
      if (waGatewayToken.trim()) payload.waGatewayToken = waGatewayToken.trim();

      const res = await fetch('/api/dealer/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Yapay Zeka ve WhatsApp ayarlarınız başarıyla kaydedildi!' });
        if (geminiApiKey) setGeminiApiKeyMasked(`${geminiApiKey.substring(0, 6)}...`);
        if (openaiApiKey) setOpenaiApiKeyMasked(`${openaiApiKey.substring(0, 6)}...`);
        setGeminiApiKey('');
        setOpenaiApiKey('');
        setWaGatewayToken('');
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Ayarlar kaydedilemedi.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Hata: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp Test Bildirimi
  const handleTestWhatsApp = async () => {
    if (!whatsappPhone) {
      alert('Lütfen önce test bildiriminin gideceği telefon numarasını giriniz.');
      return;
    }

    try {
      setTestingWhatsApp(true);
      const res = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendToWhatsApp: true,
          targetPhone: whatsappPhone,
        }),
      });

      const data = await res.json();
      if (data.whatsappResult?.webLink) {
        window.open(data.whatsappResult.webLink, '_blank');
      } else if (data.whatsappResult?.success) {
        alert('Test mesajı WhatsApp API üzerinden başarıyla iletildi!');
      } else {
        alert('Test mesajı sonucu: ' + (data.whatsappResult?.error || 'Gönderim tamamlandı.'));
      }
    } catch (e: any) {
      alert('Test hatası: ' + e.message);
    } finally {
      setTestingWhatsApp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <RefreshCw size={28} className="animate-spin text-yellow-500 mx-auto" />
          <p className="text-gray-400 text-xs">Ayarlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl">
              <Settings size={22} />
            </div>
            <div>
              <h1 className={THEME.HEADER_TITLE}>{MESSAGES.MENU_SETTINGS_AI}</h1>
              <p className="text-gray-400 text-xs mt-0.5">
                Bayinize özel Google Gemini / OpenAI anahtarlarınızı ve WhatsApp bildirim motorunuzu yapılandırın.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.AI_ASSISTANT}
              className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-yellow-500/10"
            >
              <Bot size={15} /> Asistana Git
            </Link>
            <HeaderActions />
          </div>
        </div>
      </header>

      <div className={`${THEME.PAGE_WRAPPER} max-w-4xl mx-auto space-y-6`}>
        {/* Durum Bildirimi */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/30 text-red-400'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {statusMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* ─── 1. YAPAY ZEKA (AI) SAĞLAYICI & API ANAHTARI ─── */}
          <div className={`${THEME.GLASS_CARD} p-6 space-y-5`}>
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2 text-yellow-400 font-black text-sm">
                <Sparkles size={18} />
                <h3>1. Yapay Zeka Sağlayıcısı (BYOK - Kendi Anahtarını Getir)</h3>
              </div>
              <span className="text-[11px] text-gray-400">Her bayi kendi kotasını kullanır</span>
            </div>

            {/* Sağlayıcı Seçimi */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAiProvider('GEMINI');
                  setAiModel('gemini-2.0-flash');
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  aiProvider === 'GEMINI'
                    ? 'bg-yellow-500/15 border-yellow-500 text-white shadow-lg shadow-yellow-500/10'
                    : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-yellow-400">Google Gemini</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md">
                    Ücretsiz & Hızlı
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Gemini 2.0 Flash / Pro modelleri. Google AI Studio üzerinden ücretsiz API anahtarı alınabilir.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAiProvider('OPENAI');
                  setAiModel('gpt-4o-mini');
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  aiProvider === 'OPENAI'
                    ? 'bg-yellow-500/15 border-yellow-500 text-white shadow-lg shadow-yellow-500/10'
                    : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-yellow-400">OpenAI (ChatGPT)</span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-md">
                    GPT-4o
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  OpenAI Platform API anahtarınız ile GPT-4o ve GPT-4o-mini modelleri.
                </p>
              </button>
            </div>

            {/* API Key Girişi */}
            {aiProvider === 'GEMINI' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={THEME.LABEL}>Google Gemini API Key</label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-yellow-400 hover:underline flex items-center gap-1"
                  >
                    Ücretsiz Gemini API Key Al <ExternalLink size={12} />
                  </a>
                </div>
                <input
                  type="password"
                  placeholder={geminiApiKeyMasked ? `Mevcut: ${geminiApiKeyMasked} (Değiştirmek için yeni anahtarı yazın)` : 'AIzaSy...'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className={`${THEME.INPUT} font-mono`}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className={THEME.LABEL}>OpenAI API Key</label>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-yellow-400 hover:underline flex items-center gap-1"
                  >
                    OpenAI API Key Al <ExternalLink size={12} />
                  </a>
                </div>
                <input
                  type="password"
                  placeholder={openaiApiKeyMasked ? `Mevcut: ${openaiApiKeyMasked} (Değiştirmek için yeni anahtarı yazın)` : 'sk-proj-...'}
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className={`${THEME.INPUT} font-mono`}
                />
              </div>
            )}

            {/* Model Seçimi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={THEME.LABEL}>Yapay Zeka Modeli</label>
                <select
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className={THEME.SELECT}
                >
                  {aiProvider === 'GEMINI' ? (
                    <>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (En Hızlı & Önerilen)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Detaylı Analiz)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    </>
                  ) : (
                    <>
                      <option value="gpt-4o-mini">GPT-4o Mini (Hızlı & Ekonomik)</option>
                      <option value="gpt-4o">GPT-4o (En Yüksek Akıl Yürütme)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className={THEME.LABEL}>Özel Mağaza Talimatı (Prompt Eki)</label>
                <input
                  type="text"
                  placeholder="Örn: Sadece Cuma günleri toptancı vadelerini hatırlat"
                  value={aiSystemPromptExtra}
                  onChange={(e) => setAiSystemPromptExtra(e.target.value)}
                  className={THEME.INPUT}
                />
              </div>
            </div>
          </div>

          {/* ─── 2. WHATSAPP ENTEGRASYON AYARLARI ─── */}
          <div className={`${THEME.GLASS_CARD} p-6 space-y-5`}>
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <MessageSquare size={18} />
                <h3>2. WhatsApp Bağlantı & Bildirim Motoru</h3>
              </div>
              <span className="text-[11px] text-gray-400">Patron ve Müşteri Bildirimleri</span>
            </div>

            {/* Sağlayıcı Seçimi: 1 (Web Intent) ve 3 (QR Kod Gateway) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWhatsappProvider('WEB_INTENT')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  whatsappProvider === 'WEB_INTENT'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                    : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-emerald-400">1. Doğrudan Web Intent (wa.me)</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-md">
                    Ücretsiz & Sıfır Kurulum
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Fiş, garanti belgesi veya alarm oluşturulduğunda cihazınızdaki WhatsApp tek tıkla açılır.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setWhatsappProvider('GATEWAY')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  whatsappProvider === 'GATEWAY'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                    : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-emerald-400">2. QR Kod Gateway (UltraMsg / GreenAPI)</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-bold rounded-md">
                    Otomatik Gönderim
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Mağazanızın kendi telefon numarasını QR ile bağlayarak arka planda sessiz ve otomatik mesaj atın.
                </p>
              </button>
            </div>

            {/* Patron Telefon Numarası */}
            <div className="space-y-2">
              <label className={THEME.LABEL}>Patron WhatsApp Numarası (Alarmlar & Raporlar İçin)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Örn: 05321112233 veya 905321112233"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className={`${THEME.INPUT} font-mono`}
                />
                <button
                  type="button"
                  onClick={handleTestWhatsApp}
                  disabled={testingWhatsApp}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shrink-0"
                >
                  <Send size={14} /> Test Bildirimi Gönder
                </button>
              </div>
            </div>

            {/* QR Gateway Özel Alanları */}
            {whatsappProvider === 'GATEWAY' && (
              <div className="space-y-4 pt-3 border-t border-gray-850">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-yellow-400 uppercase flex items-center gap-1.5">
                    <QrCode size={14} /> Gateway Bilgileri (UltraMsg / GreenAPI)
                  </h4>
                  <a
                    href="https://ultramsg.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-yellow-400 hover:underline flex items-center gap-1"
                  >
                    UltraMsg Hesabı Aç <ExternalLink size={12} />
                  </a>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={THEME.LABEL}>Instance ID</label>
                    <input
                      type="text"
                      placeholder="Örn: instance104829"
                      value={waGatewayInstanceId}
                      onChange={(e) => setWaGatewayInstanceId(e.target.value)}
                      className={THEME.INPUT}
                    />
                  </div>
                  <div>
                    <label className={THEME.LABEL}>Token</label>
                    <input
                      type="password"
                      placeholder="Gizli Token..."
                      value={waGatewayToken}
                      onChange={(e) => setWaGatewayToken(e.target.value)}
                      className={`${THEME.INPUT} font-mono`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Kaydet Butonu */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-500/20"
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Ayarlar Kaydediliyor...
              </>
            ) : (
              <>
                <Save size={16} /> Tüm Ayarları Kaydet
              </>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
