import type { Metadata } from "next";
import { Outfit, Noto_Sans_KR } from 'next/font/google';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import "./globals.css";

export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '500', '700'],
  variable: '--font-main',
  display: 'swap',
});

const korean = Noto_Sans_KR({
  weight: 'variable',
  subsets: ['latin'],
  variable: '--font-korean',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Dr.Clarity', template: '%s | Dr.Clarity' },
  description: "수학, 컴퓨터 과학, AI의 어려운 개념을 눈으로 보고 직접 바꾸며 이해하는 공간.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${outfit.variable} ${korean.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
