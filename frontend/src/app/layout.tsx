import type { Metadata } from 'next';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { GlobalAuthModal } from '@/components/GlobalAuthModal';

const beVietnamPro = Be_Vietnam_Pro({
  variable: '--font-sans',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://bk-store-chatbot-71mz0sirp-nobu7.vercel.app'),
  title: 'BK-Store — Smart Tech Commerce & AI Chatbot',
  description: 'Hệ thống bán lẻ thiết bị công nghệ cao cấp chính hãng tích hợp trợ lý AI thông minh BK-Bot tư vấn cấu hình và tra cứu vận đơn 24/7.',
  icons: {
    icon: '/logo-bkstore.png',
    shortcut: '/logo-bkstore.png',
    apple: '/logo-bkstore.png',
  },
  openGraph: {
    title: 'BK-Store — Smart Tech Commerce & AI Chatbot',
    description: 'Hệ thống bán lẻ thiết bị công nghệ cao cấp chính hãng tích hợp trợ lý AI thông minh BK-Bot tư vấn cấu hình và tra cứu vận đơn 24/7.',
    images: [
      {
        url: '/logo-bkstore.png',
        width: 800,
        height: 600,
        alt: 'BK-Store Logo',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${jetbrainsMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-blue-600 selection:text-white">
        {children}
        <GlobalAuthModal />
      </body>
    </html>
  );
}
