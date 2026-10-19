import type { Metadata } from 'next';
import { Inter, Urbanist } from 'next/font/google';
import './globals.css';

const urbanist = Urbanist({ variable: '--font-urbanist', subsets: ['latin'] });
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = { title: 'Tazmify Ops' };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${urbanist.variable} ${inter.variable} antialiased`}>
      <body className="min-h-screen font-body text-body">{children}</body>
    </html>
  );
}
