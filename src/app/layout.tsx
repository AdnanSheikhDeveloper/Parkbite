import type { Metadata } from 'next';
import './globals.css';
import PostHogInit from '@/components/PostHogInit';

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg-warm text-ink">
        <PostHogInit />
        <main className="flex-grow flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
