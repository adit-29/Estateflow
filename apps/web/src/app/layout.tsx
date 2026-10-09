import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'EstateFlow — Find the right property. Move the deal forward.',
    template: '%s | EstateFlow',
  },
  description:
    'Discover properties, connect with trusted real-estate professionals, and manage every step from enquiry to closing.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'EstateFlow — The real estate workspace',
    description: 'Discover properties, connect professionals, and move deals from enquiry to closing.',
    images: [{ url: '/hero-poster.svg', alt: 'EstateFlow property walkthrough poster' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans min-h-screen`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
