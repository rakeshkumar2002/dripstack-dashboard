import type { Metadata } from 'next';
import { Space_Grotesk, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// "Calm control-room" type system: Space Grotesk (display) · Hanken Grotesk
// (body) · JetBrains Mono (codes, logs, metadata).
const display = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display' });
const body = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'DripStack',
  description: 'Technical Lifecycle Communication Platform',
};

// Read DASHBOARD_API_URL per request rather than inlining NEXT_PUBLIC_API_URL at
// build time, so one Docker image serves every environment. The cost is static
// prerendering, which is free here: every page but app/page.tsx is 'use client'
// and fetches its own data.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const apiUrl =
    process.env.DASHBOARD_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  // The value is ours, but never emit a raw "</script>" sequence into an inline script.
  const cfg = JSON.stringify({ apiUrl }).replace(/</g, '\\u003c');

  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        {/* Neither async nor defer: this must run before any Next bundle hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: `window.__DRIPSTACK_CONFIG__=${cfg};` }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
