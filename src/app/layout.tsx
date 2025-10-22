import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getThemeInitScript } from '@/lib/theme-init';
import { PlatformProvider } from '@/contexts/platform-context';
import { TooltipPreferenceProvider } from '@/contexts/tooltip-context';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Underlay',
  description:
    "An ambient music generation interface powered by Google's Lyria AI. Create layered, continuous compositions with real-time controls. Perfect for sampling, freestyling, and ambient computing.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Underlay',
  },
};

export const viewport = {
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: getThemeInitScript(),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <PlatformProvider>
          <TooltipPreferenceProvider>
            {children}
          </TooltipPreferenceProvider>
        </PlatformProvider>
      </body>
    </html>
  );
}
