'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Sparkles,
  Mic,
  MicOff,
  Settings,
  Share2,
  TrendingUp,
  AlertTriangle,
  Package,
  UserCheck,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Database,
  ArrowRight,
  BellRing,
  CreditCard,
  Coins,
  Users,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';
import HeaderActions from '@/components/HeaderActions';

interface ActionProposal {
  actionType: string;
  title: string;
  description: string;
  summary: Record<string, any>;
  payload: Record<string, any>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionProposal?: ActionProposal | null;
  actionStatus?: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'CANCELLED';
  actionResultMessage?: string;
}

const PROMPT_SUGGESTIONS = [
  { icon: BellRing, label: 'Fiyat Alarmı Kur', text: 'Has altın bozma fiyatı 6600 TL olduğunda beni WhatsApptan uyaracak alarm kur.' },
  { icon: TrendingUp, label: 'Kârlılık & Ciro', text: 'Bu ayki tahmini ciro, kârlılık oranları ve nakit akışımı özetle.' },
  { icon: UserCheck, label: 'Müşteri Borçları', text: 'Has altın ve TL borcu en yüksek olan müşterileri ve tahsilat risklerini değerlendir.' },
  { icon: AlertTriangle, label: 'Kritik Stoklar', text: 'Stoğu azalan veya tükenmek üzere olan takıları ve sipariş önerilerini listele.' },
];

/**
 * Mesaj içeriğindeki :::ACTION_PROPOSAL ... ::: bloğunu ayrıştırır.
 */
function parseActionProposal(rawContent: string): { cleanContent: string; actionProposal: ActionProposal | null } {
  const match = rawContent.match(/:::ACTION_PROPOSAL\s*([\s\S]*?)\s*:::/);
  if (!match) {
    return { cleanContent: rawContent, actionProposal: null };
  }

  try {
    const jsonStr = match[1].trim();
    const actionProposal = JSON.parse(jsonStr) as ActionProposal;
    const cleanContent = rawContent.replace(/:::ACTION_PROPOSAL[\s\S]*?:::/, '').trim();
    return { cleanContent, actionProposal };
  } catch (err) {
    console.error('Action proposal JSON parse error:', err);
    return { cleanContent: rawContent, actionProposal: null };
  }
}

export default function AiAssistantClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Selamlar Patron! 👑 Ben sizin **Kuyumcu Asistanı ve Finans Danışmanınızım**.

Mağazanızın anlık **vitrin stoklarını, kasa nakitlerini, müşteri borç/alacaklarını ve canlı altın kurlarını** sürekli takip ediyorum.

Artık talimat verdiğinizde mağazanız için **Fiyat Alarmı Kurabilir**, **Müşteri Veresiyesi Yazabilir**, **Tahsilat Alabilir** ve **Kasa Hareketlerini** 2 aşamalı onayınızla doğrudan veritabanına işleyebilirim!

Size nasıl yardımcı olabilirim?`,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if dealer has configured API Key
  useEffect(() => {
    const checkSettings = async () => {
      try {
        const res = await fetch('/api/dealer/ai-settings');
        if (res.ok) {
          const data = await res.json();
          if (!data.geminiApiKeyMasked && !data.openaiApiKeyMasked) {
            setHasApiKey(false);
          }
        }
      } catch {
        /* quiet */
      }
    };
    checkSettings();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle Send Message
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      if (res.ok && data.content) {
        const { cleanContent, actionProposal } = parseActionProposal(data.content);

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: cleanContent || data.content,
          actionProposal: actionProposal || undefined,
          actionStatus: actionProposal ? 'PENDING' : undefined,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **Hata:** ${data.error || 'Yapay zeka yanıt üretemedi. Lütfen API anahtarınızı Ayarlar sayfasından kontrol ediniz.'}`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **Bağlantı Hatası:** ${err.message}`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 2. AŞAMA: Eylemi Onayla ve Veritabanına İşle
  const handleExecuteAction = async (msgId: string, proposal: ActionProposal) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, actionStatus: 'EXECUTING' } : m))
    );

    try {
      const res = await fetch('/api/ai/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: proposal.actionType,
          payload: proposal.payload,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(prev =>
          prev.map(m =>
            m.id === msgId
              ? {
                  ...m,
                  actionStatus: 'SUCCESS',
                  actionResultMessage: data.message,
                }
              : m
          )
        );
      } else {
        alert('İşlem gerçekleştirilemedi: ' + (data.error || 'Bilinmeyen hata'));
        setMessages(prev =>
          prev.map(m => (m.id === msgId ? { ...m, actionStatus: 'PENDING' } : m))
        );
      }
    } catch (err: any) {
      alert('Bağlantı hatası: ' + err.message);
      setMessages(prev =>
        prev.map(m => (m.id === msgId ? { ...m, actionStatus: 'PENDING' } : m))
      );
    }
  };

  // Eylemi İptal Et
  const handleCancelAction = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, actionStatus: 'CANCELLED' } : m))
    );
  };

  // Speech to Text (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tarayıcınız sesli konuşma tanıma özelliğini desteklemiyor.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;

    if (!isRecording) {
      setIsRecording(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
    } else {
      setIsRecording(false);
      recognition.stop();
    }
  };

  // Copy text to clipboard
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Share message via WhatsApp
  const handleShareWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <>
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl shadow-lg shadow-yellow-500/10">
              <Bot size={22} />
            </div>
            <div>
              <h1 className={`${THEME.HEADER_TITLE} flex items-center gap-2`}>
                {MESSAGES.AI_ASSISTANT_TITLE}
                <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Canlı Danışman & Eylem Motoru
                </span>
              </h1>
              <p className="text-gray-400 text-xs mt-0.5">{MESSAGES.AI_ASSISTANT_SUBTITLE}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.SETTINGS_AI}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-750 text-gray-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Settings size={14} className="text-yellow-400" /> API & WhatsApp Ayarları
            </Link>
            <HeaderActions />
          </div>
        </div>
      </header>

      <div className={`${THEME.PAGE_WRAPPER} max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)]`}>
        {/* API Key Missing Warning Banner */}
        {!hasApiKey && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400 shrink-0" />
              <span>
                Yapay Zeka API anahtarınız henüz tanımlanmamış. Ücretsiz Google Gemini veya OpenAI anahtarınızı bağlayarak sınırsız analitiği başlatabilirsiniz.
              </span>
            </div>
            <Link
              href={ROUTES.SETTINGS_AI}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black rounded-xl text-xs shrink-0 transition-colors"
            >
              Anahtar Ekle
            </Link>
          </div>
        )}

        {/* ─── SOHBET GEÇMİŞİ ALANI ─── */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-gray-950/40 border border-gray-850 shadow-inner">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-yellow-500 text-gray-950 font-semibold rounded-tr-none shadow-md shadow-yellow-500/10'
                      : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-none space-y-3'
                  }`}
                >
                  {/* Metin İçeriği */}
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  {/* ─── 2 AŞAMALI TEYİT KARTI (ACTION PROPOSAL CARD) ─── */}
                  {msg.actionProposal && (
                    <div className="mt-3 p-4 rounded-2xl bg-gray-950/80 border border-yellow-500/30 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg">
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-yellow-400 block">
                              1. Aşama: İşlem Taslağı Hazırlandı
                            </span>
                            <h4 className="font-black text-xs text-white">{msg.actionProposal.title}</h4>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-[10px] font-bold rounded-full">
                          Teyit Bekliyor
                        </span>
                      </div>

                      <p className="text-xs text-gray-300">{msg.actionProposal.description}</p>

                      {/* Parametre Tablosu */}
                      {msg.actionProposal.summary && Object.keys(msg.actionProposal.summary).length > 0 && (
                        <div className="grid grid-cols-2 gap-2 bg-gray-900/90 p-2.5 rounded-xl border border-gray-800 text-[11px]">
                          {Object.entries(msg.actionProposal.summary).map(([key, val]) => (
                            <div key={key} className="space-y-0.5">
                              <span className="text-gray-400 text-[10px] font-semibold">{key}:</span>
                              <p className="font-bold text-gray-200">{String(val)}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2. Aşama Teyit Durumu ve Butonları */}
                      <div className="pt-2">
                        {msg.actionStatus === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleExecuteAction(msg.id, msg.actionProposal!)}
                              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                            >
                              <CheckCircle2 size={15} /> 2. Aşama: İşlemi Onayla ve Uygula
                            </button>
                            <button
                              onClick={() => handleCancelAction(msg.id)}
                              className="py-2.5 px-3 bg-gray-800 hover:bg-red-500/20 hover:text-red-400 text-gray-400 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                            >
                              <XCircle size={15} /> İptal Et
                            </button>
                          </div>
                        )}

                        {msg.actionStatus === 'EXECUTING' && (
                          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                            <RefreshCw size={15} className="animate-spin" /> Veritabanına işleniyor, lütfen bekleyiniz...
                          </div>
                        )}

                        {msg.actionStatus === 'SUCCESS' && (
                          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold space-y-1">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={16} />
                              <span>2. Aşama Tamamlandı: İşlem Başarıyla Veritabanına Kaydedildi!</span>
                            </div>
                            {msg.actionResultMessage && (
                              <p className="text-[11px] font-normal text-emerald-300/90 pl-5">
                                {msg.actionResultMessage}
                              </p>
                            )}
                          </div>
                        )}

                        {msg.actionStatus === 'CANCELLED' && (
                          <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 text-xs font-semibold flex items-center gap-1.5">
                            <XCircle size={15} /> İşlem patron tarafından iptal edildi.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Alt Bilgi ve Butonlar */}
                  <div className="flex items-center justify-between gap-4 pt-2 mt-2 border-t border-white/10 text-[10px] opacity-70">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:text-yellow-400 transition-colors flex items-center gap-1"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedId === msg.id ? 'Kopyalandı' : 'Kopyala'}</span>
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(msg.content)}
                          className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                          <Share2 size={12} /> WhatsApp
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shrink-0">
                  <RefreshCw size={16} className="animate-spin" />
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-yellow-400 text-xs flex items-center gap-2">
                  <Sparkles size={14} className="animate-pulse" />
                  <span>Patron Asistanı canlı verilerinizi analiz ediyor...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* ─── HIZLI ÖNERİ BUTONLARI (PROMPT CHIPS) ─── */}
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar shrink-0">
          {PROMPT_SUGGESTIONS.map((sug, idx) => {
            const Icon = sug.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(sug.text)}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-gray-900/90 hover:bg-yellow-500/15 border border-gray-800 hover:border-yellow-500/40 text-gray-300 hover:text-yellow-400 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all shrink-0 shadow-sm disabled:opacity-50"
              >
                <Icon size={13} className="text-yellow-400" />
                {sug.label}
              </button>
            );
          })}
        </div>

        {/* ─── METİN GİRİŞ ALANI & SESLİ MİKROFON ─── */}
        <div className="pt-2 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-gray-950 p-2 rounded-2xl border border-gray-800 shadow-xl focus-within:border-yellow-500/60 transition-all"
          >
            {/* Sesli Konuşma Mikrofon Butonu */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-3 rounded-xl transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                  : 'bg-gray-900 text-gray-400 hover:text-yellow-400 hover:bg-gray-800'
              }`}
              title={isRecording ? 'Dinlemeyi Durdur' : 'Sesli Soru Sor'}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Metin Girişi */}
            <input
              type="text"
              placeholder={isRecording ? 'Sizi dinliyorum, konuşun...' : 'Asistana bir soru sorun veya talimat verin (Örn: Has altın 6600 olunca bana haber ver)...'}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent px-3 text-xs sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none disabled:opacity-50"
            />

            {/* Gönder Butonu */}
            <button
              type="submit"
              disabled={!inputQuery.trim() || loading}
              className="p-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:hover:bg-yellow-500 text-gray-950 rounded-xl transition-all font-black shadow-md shadow-yellow-500/10 flex items-center justify-center shrink-0"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
