import type { Metadata } from "next";
import { Outfit } from 'next/font/google';
import { SiteHeader } from '@/components/layout/SiteHeader';
import "./globals.css";

export const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '500', '700'],
  variable: '--font-main',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Dr.Clarity', template: '%s | Dr.Clarity' },
  description: "Dr.Clarity Educational App",
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
    <html lang="ko" className={outfit.variable}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
