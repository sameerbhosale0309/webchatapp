import type { Metadata } from 'next';
import { Sora, Inter, JetBrains_Mono } from 'next/font/google';
import './global.css';
import { Providers } from './providers';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['500', '600', '700'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600'] });
const jbMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'Real Time VartaLaab',
  description: '',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${sora.variable} ${inter.variable} ${jbMono.variable} font-body antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}