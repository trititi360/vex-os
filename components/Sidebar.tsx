'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Terminal, Activity, Users, FileText, Calendar, Brain, History } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'DASHBOARD', icon: Activity, color: '#00ff88' },
  { href: '/org', label: 'ORG CHART', icon: Users, color: '#00d4ff' },
  { href: '/agents', label: 'AGENT CONFIG', icon: FileText, color: '#ffaa00' },
  { href: '/standup', label: 'DAILY STANDUP', icon: Calendar, color: '#a855f7' },
  { href: '/memory', label: 'MEMORY VIEWER', icon: Brain, color: '#a855f7' },
  { href: '/sessions', label: 'SESSION LOG', icon: History, color: '#00d4ff' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 flex-shrink-0 border-r border-[#111118] bg-[#0a0a0e] flex flex-col items-center py-4 sticky top-0 h-screen">
      {/* Logo */}
      <Link href="/" className="mb-8 select-none group">
        <div className="relative">
          <Terminal className="w-6 h-6 text-[#00ff88]" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#00ff88] blink" />
        </div>
      </Link>

      {/* Nav items */}
      <nav className="flex flex-col gap-2 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, color }) => {
          // For dashboard, only exact match; for others, startsWith
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-[#111118] border border-[#1a1a2e]'
                  : 'hover:bg-[#111118]/50'
              }`}
              style={{
                borderColor: isActive ? `${color}30` : undefined,
              }}
            >
              <Icon
                className="w-4 h-4 transition-colors"
                style={{ color: isActive ? color : '#374151' }}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
