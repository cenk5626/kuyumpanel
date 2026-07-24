import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { MESSAGES } from '@/constants/messages';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: MESSAGES.APP_NAME,
  description: MESSAGES.APP_SUBTITLE,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-gray-950 text-gray-100`}>
        {children}
      </body>
    </html>
  );
}
