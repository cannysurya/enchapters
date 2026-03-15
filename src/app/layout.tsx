import type { Metadata, Viewport } from 'next';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import NavBar from '@/components/NavBar';
import { NavProvider } from '@/context/NavContext';

export const metadata: Metadata = {
  title: 'Enchapters',
  description: 'Immerse yourself in a breezy reading experience.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Enchapters',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavProvider>
            <NavBar />
            {children}
          </NavProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
