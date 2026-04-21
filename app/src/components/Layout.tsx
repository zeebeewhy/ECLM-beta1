import { Link, useLocation } from 'react-router-dom';
import { PenLine, Network, Settings, Home } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();

  const nav = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/free', icon: PenLine, label: 'Write' },
    { to: '/progress', icon: Network, label: 'Network' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <span className="font-semibold text-lg">ECLM</span>
          </Link>
          <nav className="flex gap-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${loc.pathname === n.to ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                <n.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{n.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
