import type { Metadata } from 'next';
import { Inter, Syne } from 'next/font/google';
import './globals.css';
import { OmniverseStreamProvider } from '@/components/omniverse/OmniverseStreamProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-syne',
});

export const metadata: Metadata = {
  title: 'IGNIZIA – The Living Intelligence Platform',
  description: 'IGNIZIA: The Living Intelligence Platform for operational, leadership, and frontline intelligence.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} ${syne.variable} font-sans bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 antialiased overflow-hidden`}
      >
        <OmniverseStreamProvider>{children}</OmniverseStreamProvider>
      </body>
    </html>
  );
}
