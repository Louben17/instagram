import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Instagram Widget Generator | Shoptet E-shop Integration',
  description: 'Vytvářejte krásné Instagram feedy pro vaše Shoptet e-shopy. Jednoduché, rychlé a bez API klíčů.',
  keywords: 'Instagram widget, Shoptet, e-shop, Instagram feed, widget generator',
  authors: [{ name: 'Instagram Widget Generator' }],
  openGraph: {
    title: 'Instagram Widget Generator',
    description: 'Vytvářejte krásné Instagram feedy pro vaše Shoptet e-shopy',
    type: 'website',
    locale: 'cs_CZ',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#9333ea" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}