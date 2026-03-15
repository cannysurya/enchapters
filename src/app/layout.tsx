import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import NavBar from '@/components/NavBar';
import { NavProvider } from '@/context/NavContext';

export const metadata: Metadata = {
  title: 'Enchapters',
  description: 'Immerse yourself in a breezy reading experience.',
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
