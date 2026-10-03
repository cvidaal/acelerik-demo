import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <AppSidebar />
      <MobileNav />
      <main className="flex-1 lg:p-6 p-4 pt-20 lg:pt-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 text-right"><Link className="text-sm text-primary underline" to="/reservar">Ver página pública de reserva →</Link></div>
          {children}
        </div>
      </main>
    </div>
  );
}
