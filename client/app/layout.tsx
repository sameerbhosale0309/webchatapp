import type { Metadata } from 'next';
import './global.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'varta-लाप',
  description: '.',
  icons: {
    icon: '/favicon.svg',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <body className="font-mono antialiased bg-canvas text-dark-oxide min-h-screen crt-overlay selection:bg-magnetic-oxide selection:text-paper-display">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}