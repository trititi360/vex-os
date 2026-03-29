'use client';

import { useState, useEffect } from 'react';
import OrgNode from '@/components/OrgNode';
import { RefreshCw } from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  role?: string;
  model?: string;
}

// Accent colors per agent id (fallback to a default)
const ACCENT_MAP: Record<string, string> = {
  main: '#00d4ff',
  gary: '#a855f7',
  vi: '#00ff88',
};
const DEFAULT_ACCENT = '#6b7280';

function getAccent(id: string) {
  return ACCENT_MAP[id] ?? DEFAULT_ACCENT;
}

// ─── Connector ────────────────────────────────────────────────────────────────

function Connector({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-px h-10"
        style={{ background: `linear-gradient(to bottom, ${from}50, ${to}50)` }}
      />
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${to}60` }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      setAgents(data.agents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Bogdan is always the root node (human)
  const BOGDAN = {
    emoji: '👑',
    name: 'Bogdan Dobritoiu',
    title: 'Chief Executive Officer',
    role: 'Human' as const,
    status: 'online' as const,
    description: 'The Visionary',
    accent: '#ffaa00',
  };

  return (
    <div className="min-h-screen bg-[#030305] flex flex-col text-[#e0e0e0] flex-1">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.018]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 4px)',
        }}
      />

      <main className="flex-1 flex flex-col items-center px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="text-[10px] font-mono text-[#374151] tracking-[0.3em] uppercase mb-2">
            VexOS · Structure
          </div>
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-xl font-mono font-bold text-[#e0e0e0] tracking-[0.15em]">
              Organization Chart
            </h1>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111118] border border-[#1a1a2e] text-[10px] font-mono text-[#374151] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-3 mx-auto w-32 h-px bg-gradient-to-r from-transparent via-[#1a1a2e] to-transparent" />
        </div>

        {error && (
          <div className="mb-8 px-4 py-3 rounded border border-[#ff4444]/30 bg-[#ff4444]/10 text-xs font-mono text-[#ff4444]">
            {error}
          </div>
        )}

        {/* Tree */}
        {loading ? (
          <div className="flex items-center gap-2 text-[#374151] font-mono text-xs">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading agents from openclaw.json...
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Root: Bogdan */}
            <OrgNode {...BOGDAN} />

            {/* AI Agents from openclaw.json */}
            {agents.map((agent, i) => {
              const accent = getAccent(agent.id);
              const prevAccent = i === 0 ? BOGDAN.accent : getAccent(agents[i - 1].id);
              return (
                <div key={agent.id} className="flex flex-col items-center">
                  <Connector from={prevAccent} to={accent} />
                  <OrgNode
                    emoji={agent.emoji}
                    name={agent.name}
                    title={`Agent · ${agent.id}`}
                    role="AI"
                    status="online"
                    description={agent.role ?? `AI agent — workspace-${agent.id}`}
                    task={agent.model ? `Model: ${agent.model.split('/').pop()}` : 'Currently idle'}
                    accent={accent}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-16 flex items-center gap-6">
          {[
            { label: 'Human', color: '#ffaa00' },
            { label: 'AI Agent', color: '#00d4ff' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] font-mono tracking-widest" style={{ color }}>
                {label.toUpperCase()}
              </span>
            </div>
          ))}
          {!loading && (
            <span className="text-[9px] font-mono text-[#374151] tracking-widest">
              {agents.length} AGENTS REGISTERED
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
