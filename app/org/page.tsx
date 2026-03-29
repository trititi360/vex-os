import Link from 'next/link';
import { Terminal, ChevronRight, Users } from 'lucide-react';
import OrgNode from '@/components/OrgNode';

// ─── Org data ─────────────────────────────────────────────────────────────────

const CEO = {
  emoji: '👑',
  name: 'Bogdan Dobritoiu',
  title: 'Chief Executive Officer',
  role: 'Human' as const,
  status: 'online' as const,
  description: 'The Visionary',
  accent: '#ffaa00',
};

const COO = {
  emoji: '⚡',
  name: 'Vex',
  title: 'Chief Operating Officer',
  role: 'AI' as const,
  status: 'online' as const,
  description: 'Builds, ships, orchestrates agents',
  task: 'Currently idle',
  accent: '#00d4ff',
};

const CMO = {
  emoji: '🎯',
  name: 'Gary',
  title: 'Chief Marketing Officer',
  role: 'AI' as const,
  status: 'online' as const,
  description: 'Marketing, growth, positioning',
  accent: '#a855f7',
};

// ─── Connector ────────────────────────────────────────────────────────────────

function Connector({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-px h-10"
        style={{ background: `linear-gradient(to bottom, ${from}50, ${to}50)` }}
      />
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: `${to}60` }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  return (
    <div className="min-h-screen bg-[#030305] flex flex-col text-[#e0e0e0]">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.018]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 4px)',
        }}
      />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 h-[3.75rem] border-b border-[#111118] bg-[#030305]/95 backdrop-blur-sm flex items-center px-5 gap-5 flex-shrink-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 select-none group">
          <div className="relative flex-shrink-0">
            <Terminal className="w-5 h-5 text-[#00ff88]" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#00ff88] blink" />
          </div>
          <div>
            <div className="text-[13px] font-mono font-black text-[#00ff88] tracking-[0.35em] leading-none">
              VEX OS
            </div>
            <div className="text-[9px] font-mono text-[#2a2a3e] tracking-[0.2em] leading-none mt-0.5">
              AGENT MONITOR
            </div>
          </div>
        </Link>

        <div className="w-px h-7 bg-[#111118]" />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
          <Link
            href="/"
            className="text-[10px] font-mono text-[#374151] hover:text-[#00ff88] tracking-wider transition-colors"
          >
            DASHBOARD
          </Link>
          <ChevronRight className="w-3 h-3 text-[#2a2a3e]" />
          <span className="text-[10px] font-mono text-[#00d4ff] tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3" />
            ORG CHART
          </span>
        </nav>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center px-4 py-12">
        {/* Page title */}
        <div className="text-center mb-12">
          <div className="text-[10px] font-mono text-[#374151] tracking-[0.3em] uppercase mb-2">
            VexOS · Structure
          </div>
          <h1 className="text-xl font-mono font-bold text-[#e0e0e0] tracking-[0.15em]">
            Organization Chart
          </h1>
          <div className="mt-3 mx-auto w-32 h-px bg-gradient-to-r from-transparent via-[#1a1a2e] to-transparent" />
        </div>

        {/* Tree */}
        <div className="flex flex-col items-center">
          <OrgNode {...CEO} />
          <Connector from={CEO.accent} to={COO.accent} />
          <OrgNode {...COO} />
          <Connector from={COO.accent} to={CMO.accent} />
          <OrgNode {...CMO} />
        </div>

        {/* Legend */}
        <div className="mt-16 flex items-center gap-6">
          {[
            { label: 'Human', color: '#ffaa00' },
            { label: 'AI Agent', color: '#00d4ff' },
            { label: 'Coming Soon', color: '#374151' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-[9px] font-mono tracking-widest" style={{ color }}>
                {label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
