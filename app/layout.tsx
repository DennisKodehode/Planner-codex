import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DayPlanner',
  description: 'Plan your day with voice commands and discover nearby activities.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
