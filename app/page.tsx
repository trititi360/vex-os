'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle,
  Cpu,
  Database,
  Terminal,
  Users,
  XCircle,
  Zap,
} from 'lucide-react';
import AgentCard from '@/components/AgentCard';
import StatusBar from '@/components/StatusBar';
import { Agent } from '@/types/agent';

// ─── Mock data ───────────────────────────────────────────────────────────────

const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'main',
    status: 'running',
    currentTask:
      'Implementing JWT authentication middleware with refresh-token rotation and session management',
    startTime: new Date(Date.now() - 45 * 60 * 1000),
    progress: 67,
    logs: [
      '> npm run build -- --filter=@repo/auth',
      '✓ Built auth module in 2.3s',
      '> Running test suite...',
      '✓ 47 tests passed, 0 failed',
      '> Applying migration 0023_add_sessions_table',
      '✓ Migration applied successfully',
    ],
    tokenUsage: 45230,
  },
  {
    id: '2',
    name: 'feature/ui',
    status: 'running',
    currentTask:
      'Building responsive dashboard layout with Tailwind CSS v4 and shadcn/ui component system',
    startTime: new Date(Date.now() - 23 * 60 * 1000),
    progress: 34,
    logs: [
      '> npx shadcn@latest init',
      '✓ Initialized components.json',
      '> npx shadcn@latest add card button badge dialog',
      '✓ Added 4 components',
      '> Generating responsive layouts...',
      '⚠ Warning: viewport breakpoint conflict in mobile nav',
    ],
    tokenUsage: 28140,
  },
  {
    id: '3',
    name: 'feature/api',
    status: 'done',
    currentTask: 'REST API endpoints for user management — COMPLETED',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    progress: 100,
    logs: [
      '> Running endpoint validation suite...',
      '✓ POST /api/users — 201 Created',
      '✓ GET  /api/users/:id — 200 OK',
      '✓ PATCH /api/users/:id — 200 OK',
      '✓ DELETE /api/users/:id — 204 No Content',
      '✓ All 12 integration tests passed',
      '> Deployment artifact ready',
    ],
    tokenUsage: 89420,
  },
  {
    id: '4',
    name: 'feature/polish',
    status: 'done',
    currentTask: 'UI polish complete — glassmorphism cards, animations, transitions deployed',
    startTime: new Date(Date.now() - 45 * 60 * 1000),
    progress: 100,
    logs: [
      '> npm run build',
      '✓ Compiled successfully in 1824ms',
      '> Running TypeScript check...',
      '✓ Finished TypeScript in 1410ms',
      '> Generating static pages...',
      '✓ Route (/) prerendered',
      '> Merging feature/polish → main',
      '✓ Deployed to https://snowframe.vercel.app',
    ],
    tokenUsage: 28450,
  },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function SystemSidebar({ agents }: { agents: Agent[] }) {
  const active = agents.filter((a) => a.status === 'running').length;
  const done = agents.filter((a) => a.status === 'done').length;
  const errors = agents.filter((a) => a.status === 'error').length;
  const totalTokens = agents.reduce((sum, a) => sum + a.tokenUsage, 0);
  const avgProgress = Math.round(
    agents.reduce((sum, a) => sum + a.progress, 0) / agents.length
  );

  const statusColor: Record<string, string> = {
    running: '#00ff88',
    idle: '#ffaa00',
    done: '#44ff88',
    error: '#ff4444',
  };

  return (
    <aside className="w-60 flex-shrink-0 space-y-3 sticky top-[3.75rem] self-start">
      {/* System stats */}
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-3.5 h-3.5 text-[#00d4ff]" />
          <span className="text-[10px] font-mono font-bold text-[#00d4ff] tracking-[0.2em]">
            SYSTEM
          </span>
        </div>

        <div className="space-y-2.5">
          {[
            { label: 'TOTAL AGENTS', value: String(agents.length), color: '#e0e0e0' },
            { label: 'ACTIVE', value: String(active), color: '#00ff88' },
            { label: 'COMPLETED TODAY', value: String(done), color: '#44ff88' },
            { label: 'ERRORS', value: String(errors), color: errors > 0 ? '#ff4444' : '#374151' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#374151] tracking-wider">
                {label}
              </span>
              <span className="text-sm font-mono font-bold" style={{ color }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-[#111118]">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-mono text-[#374151] tracking-wider">
              AVG PROGRESS
            </span>
            <span className="text-[10px] font-mono text-[#00d4ff]">{avgProgress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[#111118] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88] transition-all duration-700"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Token usage */}
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-3.5 h-3.5 text-[#ffaa00]" />
          <span className="text-[10px] font-mono font-bold text-[#ffaa00] tracking-[0.2em]">
            TOKEN USAGE
          </span>
        </div>

        <div className="text-2xl font-mono font-bold text-[#e0e0e0] tabular-nums leading-none">
          {(totalTokens / 1000).toFixed(1)}
          <span className="text-sm text-[#374151] ml-1">k</span>
        </div>
        <div className="text-[10px] font-mono text-[#374151] tracking-wider mt-1 mb-4">
          TOTAL TOKENS
        </div>

        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-2">
              <span className="w-[68px] text-[10px] font-mono text-[#374151] truncate">
                {agent.name}
              </span>
              <div className="flex-1 h-1 rounded-full bg-[#111118] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(agent.tokenUsage / totalTokens) * 100}%`,
                    backgroundColor: statusColor[agent.status],
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-[#374151] w-7 text-right tabular-nums">
                {Math.round(agent.tokenUsage / 1000)}k
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Process list */}
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-3.5 h-3.5 text-[#00ff88]" />
          <span className="text-[10px] font-mono font-bold text-[#00ff88] tracking-[0.2em]">
            PROCESSES
          </span>
        </div>

        <div className="space-y-2.5">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  agent.status === 'running' ? 'blink' : ''
                }`}
                style={{ backgroundColor: statusColor[agent.status] }}
              />
              <span className="text-[10px] font-mono text-[#6b7280] truncate flex-1">
                {agent.name}
              </span>
              <span
                className="text-[10px] font-mono font-bold"
                style={{ color: statusColor[agent.status] }}
              >
                {agent.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Resource meters */}
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-3.5 h-3.5 text-[#00d4ff]" />
          <span className="text-[10px] font-mono font-bold text-[#00d4ff] tracking-[0.2em]">
            RESOURCES
          </span>
        </div>

        {[
          { label: 'CPU', pct: 24, color: '#00ff88' },
          { label: 'MEM', pct: 61, color: '#00d4ff' },
          { label: 'DISK', pct: 38, color: '#ffaa00' },
        ].map(({ label, pct, color }) => (
          <div key={label} className="mb-2 last:mb-0">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-mono text-[#374151]">{label}</span>
              <span className="text-[10px] font-mono" style={{ color }}>
                {pct}%
              </span>
            </div>
            <div className="h-1 w-full rounded-full bg-[#111118] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const activeCount = MOCK_AGENTS.filter((a) => a.status === 'running').length;
  const doneCount = MOCK_AGENTS.filter((a) => a.status === 'done').length;
  const errorCount = MOCK_AGENTS.filter((a) => a.status === 'error').length;

  return (
    <div className="min-h-screen bg-[#030305] flex flex-col text-[#e0e0e0]">
      {/* Global scanline overlay */}
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
        <div className="flex items-center gap-3 select-none">
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
        </div>

        <div className="w-px h-7 bg-[#111118]" />

        {/* Status pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[#00ff88]/8 border border-[#00ff88]/20 px-2.5 py-1">
            <Activity className="w-3 h-3 text-[#00ff88]" />
            <span className="text-[10px] font-mono text-[#374151]">ACTIVE</span>
            <span className="text-[10px] font-mono font-bold text-[#00ff88]">
              {activeCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-[#44ff88]/8 border border-[#44ff88]/20 px-2.5 py-1">
            <CheckCircle className="w-3 h-3 text-[#44ff88]" />
            <span className="text-[10px] font-mono text-[#374151]">DONE</span>
            <span className="text-[10px] font-mono font-bold text-[#44ff88]">
              {doneCount}
            </span>
          </div>

          {errorCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-[#ff4444]/8 border border-[#ff4444]/30 px-2.5 py-1">
              <XCircle className="w-3 h-3 text-[#ff4444]" />
              <span className="text-[10px] font-mono text-[#374151]">ERR</span>
              <span className="text-[10px] font-mono font-bold text-[#ff4444]">
                {errorCount}
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <Link
          href="/org"
          className="flex items-center gap-1.5 rounded-full bg-[#00d4ff]/8 border border-[#00d4ff]/20 px-2.5 py-1 hover:bg-[#00d4ff]/15 transition-colors"
        >
          <Users className="w-3 h-3 text-[#00d4ff]" />
          <span className="text-[10px] font-mono text-[#00d4ff] tracking-wider">ORG</span>
        </Link>

        {/* Clock */}
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right select-none">
            <div className="text-sm font-mono font-bold text-[#e0e0e0] tracking-[0.15em] tabular-nums leading-none">
              {time}
            </div>
            <div className="text-[9px] font-mono text-[#374151] tracking-widest leading-none mt-0.5">
              {date}
            </div>
          </div>

          <div className="w-px h-7 bg-[#111118]" />

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] blink" />
            <span className="text-[10px] font-mono text-[#00ff88] tracking-wider">
              ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex flex-1 gap-4 p-4 pb-10 min-h-0">
        {/* Agent cards */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span className="text-[10px] font-mono font-bold text-[#00d4ff] tracking-[0.2em]">
              AGENT PROCESSES
            </span>
            <span className="text-[10px] font-mono text-[#2a2a3e]">
              ({MOCK_AGENTS.length} registered)
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {MOCK_AGENTS.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <SystemSidebar agents={MOCK_AGENTS} />
      </main>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <StatusBar />
    </div>
  );
}
