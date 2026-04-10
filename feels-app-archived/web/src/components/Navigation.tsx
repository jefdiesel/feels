'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, MessageCircle, User, Settings } from 'lucide-react';

const navItems = [
  { href: '/feed', icon: Heart, label: 'Feed' },
  { href: '/matches', icon: MessageCircle, label: 'Matches' },
  { href: '/profile', icon: User, label: 'Profile' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="fixed left-0 top-0 hidden h-full w-20 flex-col items-center border-r border-dark-800 bg-dark py-8 lg:flex">
        <Link href="/feed" className="mb-8">
          <span className="gradient-text text-2xl font-bold">f</span>
        </Link>

        <div className="flex flex-1 flex-col items-center gap-2">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-dark-400 hover:bg-dark-900 hover:text-white'
                }`}
                title={label}
              >
                <Icon size={24} />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-dark-800 bg-dark/95 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-dark-400'
                }`}
              >
                <Icon size={24} />
                <span className="text-xs">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
