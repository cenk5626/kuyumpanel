'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Gem, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { MESSAGES } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(MESSAGES.LOGIN_ERROR_INVALID);
      } else {
        router.push(ROUTES.DASHBOARD);
        router.refresh();
      }
    } catch {
      setError(MESSAGES.LOGIN_ERROR_GENERIC);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-950 px-4 py-8 relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-900/20 via-gray-950 to-gray-950 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card (Guaranteed 100% Visible) */}
      <div className="relative z-10 w-full max-w-md bg-gray-900 border border-yellow-700/40 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-yellow-500/20 border border-yellow-300/30">
            <Gem className="w-9 h-9 text-gray-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 text-center tracking-tight">
            {MESSAGES.APP_NAME}
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 text-center font-medium">
            {MESSAGES.APP_SUBTITLE}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div>
            <label htmlFor="login-email" className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5">
              {MESSAGES.LOGIN_EMAIL_LABEL}
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={MESSAGES.LOGIN_EMAIL_PLACEHOLDER}
              required
              autoComplete="email"
              className="w-full px-4 py-3 bg-gray-950 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-colors"
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="login-password" className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1.5">
              {MESSAGES.LOGIN_PASSWORD_LABEL}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={MESSAGES.LOGIN_PASSWORD_PLACEHOLDER}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-gray-950 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 p-1 transition-colors"
                aria-label="Şifreyi Göster/Gizle"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold text-center animate-shake">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-400 hover:to-amber-500 text-gray-950 font-black rounded-xl text-sm transition-all duration-200 shadow-lg shadow-yellow-500/25 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <span>{MESSAGES.LOGIN_LOADING}</span>
            ) : (
              <>
                <span>{MESSAGES.LOGIN_BUTTON}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-gray-800/80 text-center">
          <p className="text-[11px] text-gray-500">
            Güvenli Kuyumcu Yönetim Altyapısı
          </p>
        </div>

      </div>
    </div>
  );
}
