import type { Metadata } from "next";
import { Outfit } from 'next/font/google';
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={outfit.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
