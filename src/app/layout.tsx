import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';
import './globals.css';
import PostHogInit from '@/components/PostHogInit';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ParkBite Express | Hyperlocal Food Delivery',
  description: 'Order hot snacks, chai, and quick meals inside the IT Park in Bhopal. Delivering daily at 11:00 AM and 4:00 PM.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable} ${lora.variable}`}>
      <body className="min-h-full flex flex-col bg-bg-warm text-ink font-sans">
        <PostHogInit />
        <main className="flex-grow flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
