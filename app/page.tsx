'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle,
  Cpu,
  Database,
  RefreshCw,
  XCircle,
  Zap,
} from 'lucide-react';
import AgentCard from '@/components/AgentCard';
import StatusBar from '@/components/StatusBar';
import CronManager from '@/components/CronManager';
import { Agent } from '@/types/agent';

// ─── Session types (mirrors /api/sessions) ────────────────────────────────────

interface SessionEntry {
  sessionKey: string;
  sessionId: string;
  status: 'running' | 'done' | 'idle' | 'error';
  model?: string;
  totalTokens: number;
  estimatedCostUsd?: number;
  updatedAt: number;
  startedAt?: number;
  compactionCount?: number;
  lastChannel?: string;
}

interface AgentSessions {
  agentId: string;
  sessions: SessionEntry[];
}

// ─── Map openclaw agent configs → Agent display objects ──────────────────────

interface AgentConfig {
  id: string;
  name: string;
  emoji: string;
  workspace: string;
  role?: string;
  model?: string;
}

function configToAgent(cfg: AgentConfig, startedAt: Date): Agent {
  return {
    id: cfg.id,
    name: `${cfg.emoji} ${cfg.name}`,
    status: 'idle',
    currentTask: cfg.role ? cfg.role : `Agent ${cfg.name} — ready`,
    startTime: startedAt,
    progress: 0,
    logs: [
      `> Agent ${cfg.name} initialized`,
      `> Workspace: ${cfg.workspace}`,
      cfg.model ? `> Model: ${cfg.model}` : '> Model: default',
      '> Waiting for tasks...',
    ],
    tokenUsage: 0,
  };
}

// ─── Right Sidebar ────────────────────────────────────────────────────────────

function RightSidebar({
  agents,
  agentSessions,
}: {
  agents: Agent[];
  agentSessions: AgentSessions[];
}) {
  const active = agents.filter((a) => a.status === 'running').length;
  const done = agents.filter((a) => a.status === 'done').length;
  const errors = agents.filter((a) => a.status === 'error').length;

  // Token totals from real sessions
  const totalTokens = agentSessions.reduce(
    (sum, a) => sum + a.sessions.reduce((s, sess) => s + sess.totalTokens, 0),
    0
  );
  const avgProgress =
    agents.length > 0
      ? Math.round(agents.reduce((sum, a) => sum + a.progress, 0) / agents.length)
      : 0;

  const statusColor: Record<string, string> = {
    running: '#00ff88',
    idle: '#ffaa00',
    done: '#44ff88',
    error: '#ff4444',
  };

  return (
    <aside className="w-60 flex-shrink-0 space-y-3 sticky top-4 self-start">
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
              <span className="text-[10px] font-mono text-[#374151] tracking-wider">{label}</span>
              <span className="text-sm font-mono font-bold" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-[#111118]">
          <div className="flex justify-between mb-1.5">
            <span className="text-[10px] font-mono text-[#374151] tracking-wider">AVG PROGRESS</span>
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
          {agentSessions.map((a) => {
            const agentTokens = a.sessions.reduce((s, sess) => s + sess.totalTokens, 0);
            const hasRunning = a.sessions.some((s) => s.status === 'running');
            const color = hasRunning ? statusColor.running : statusColor.idle;
            return (
              <div key={a.agentId} className="flex items-center gap-2">
                <span className="w-[68px] text-[10px] font-mono text-[#374151] truncate capitalize">
                  {a.agentId}
                </span>
                <div className="flex-1 h-1 rounded-full bg-[#111118] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: totalTokens > 0 ? `${(agentTokens / totalTokens) * 100}%` : '0%',
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[#374151] w-7 text-right tabular-nums">
                  {Math.round(agentTokens / 1000)}k
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Process list — real sessions per agent */}
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-3.5 h-3.5 text-[#00ff88]" />
          <span className="text-[10px] font-mono font-bold text-[#00ff88] tracking-[0.2em]">
            PROCESSES
          </span>
        </div>

        <div className="space-y-4">
          {agentSessions.map((a) => (
            <div key={a.agentId}>
              {/* Agent header */}
              <div className="text-[9px] font-mono text-[#374151] tracking-[0.25em] uppercase mb-1.5 flex items-center gap-1.5">
                <span
                  className="w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: a.sessions.some((s) => s.status === 'running')
                      ? '#00ff88'
                      : '#374151',
                  }}
                />
                {a.agentId}
              </div>

              {/* Sessions */}
              <div className="space-y-1 pl-2.5 border-l border-[#1a1a2e]">
                {a.sessions.length === 0 ? (
                  <div className="text-[9px] font-mono text-[#2a2a3e]">no sessions</div>
                ) : (
                  a.sessions
                    .sort((x, y) => (y.updatedAt ?? 0) - (x.updatedAt ?? 0))
                    .map((sess) => {
                      const shortKey = sess.sessionKey.split(':').slice(2).join(':') || sess.sessionKey;
                      const color = statusColor[sess.status] ?? '#374151';
                      return (
                        <div key={sess.sessionId} className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sess.status === 'running' ? 'blink' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-[9px] font-mono text-[#4b5563] truncate flex-1 max-w-[80px]">
                            {shortKey}
                          </span>
                          <span className="text-[9px] font-mono" style={{ color }}>
                            {sess.status.toUpperCase()}
                          </span>
                          {sess.totalTokens > 0 && (
                            <span className="text-[9px] font-mono text-[#2a2a3e] tabular-nums">
                              {Math.round(sess.totalTokens / 1000)}k
                            </span>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
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
              <span className="text-[10px] font-mono" style={{ color }}>{pct}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-[#111118] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Cron Manager */}
      <CronManager />
    </aside>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  activeCount,
  doneCount,
  errorCount,
  loading,
  onRefresh,
}: {
  activeCount: number;
  doneCount: number;
  errorCount: number;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-[3.75rem] border-b border-[#111118] bg-[#030305]/95 backdrop-blur-sm flex items-center px-5 gap-5 flex-shrink-0">
      <div className="flex items-center gap-3 select-none">
        <div>
          <div className="text-[13px] font-mono font-black text-[#00ff88] tracking-[0.35em] leading-none">VEX OS</div>
          <div className="text-[9px] font-mono text-[#2a2a3e] tracking-[0.2em] leading-none mt-0.5">AGENT MONITOR</div>
        </div>
      </div>

      <div className="w-px h-7 bg-[#111118]" />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-[#00ff88]/8 border border-[#00ff88]/20 px-2.5 py-1">
          <Activity className="w-3 h-3 text-[#00ff88]" />
          <span className="text-[10px] font-mono text-[#374151]">ACTIVE</span>
          <span className="text-[10px] font-mono font-bold text-[#00ff88]">{activeCount}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-[#44ff88]/8 border border-[#44ff88]/20 px-2.5 py-1">
          <CheckCircle className="w-3 h-3 text-[#44ff88]" />
          <span className="text-[10px] font-mono text-[#374151]">DONE</span>
          <span className="text-[10px] font-mono font-bold text-[#44ff88]">{doneCount}</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-[#ff4444]/8 border border-[#ff4444]/30 px-2.5 py-1">
            <XCircle className="w-3 h-3 text-[#ff4444]" />
            <span className="text-[10px] font-mono text-[#374151]">ERR</span>
            <span className="text-[10px] font-mono font-bold text-[#ff4444]">{errorCount}</span>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111118] border border-[#1a1a2e] text-[10px] font-mono text-[#374151] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          REFRESH
        </button>

        <div className="text-right select-none">
          <div className="text-sm font-mono font-bold text-[#e0e0e0] tracking-[0.15em] tabular-nums leading-none">{time}</div>
          <div className="text-[9px] font-mono text-[#374151] tracking-widest leading-none mt-0.5">{date}</div>
        </div>

        <div className="w-px h-7 bg-[#111118]" />

        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] blink" />
          <span className="text-[10px] font-mono text-[#00ff88] tracking-wider">ONLINE</span>
        </div>
      </div>
    </header>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentSessions, setAgentSessions] = useState<AgentSessions[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const [agentsRes, sessionsRes] = await Promise.all([
        fetch('/api/agents'),
        fetch('/api/sessions'),
      ]);

      if (!agentsRes.ok) throw new Error('Failed to load agents');
      const agentsData = await agentsRes.json();

      const now = new Date();
      const mapped: Agent[] = (agentsData.agents ?? []).map((cfg: AgentConfig) =>
        configToAgent(cfg, now)
      );
      setAgents(mapped);

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        setAgentSessions(sessionsData.agents ?? []);
      }
    } catch (e) {
      console.error('Error loading agents:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh sessions every 10s
  useEffect(() => {
    loadAgents();
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/sessions');
        if (res.ok) {
          const data = await res.json();
          setAgentSessions(data.agents ?? []);
        }
      } catch { /* silent */ }
    }, 10_000);
    return () => clearInterval(id);
  }, [loadAgents]);

  const activeCount = agents.filter((a) => a.status === 'running').length;
  const doneCount = agents.filter((a) => a.status === 'done').length;
  const errorCount = agents.filter((a) => a.status === 'error').length;

  return (
    <div className="min-h-screen bg-[#030305] flex flex-col text-[#e0e0e0] flex-1">
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.018]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 4px)',
        }}
      />

      <Header
        activeCount={activeCount}
        doneCount={doneCount}
        errorCount={errorCount}
        loading={loading}
        onRefresh={loadAgents}
      />

      <main className="flex flex-1 gap-4 p-4 pb-10 min-h-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span className="text-[10px] font-mono font-bold text-[#00d4ff] tracking-[0.2em]">
              AGENT PROCESSES
            </span>
            <span className="text-[10px] font-mono text-[#2a2a3e]">
              {loading ? '(loading...)' : `(${agents.length} registered)`}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-[#374151] font-mono text-xs mt-8">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading agents from openclaw.json...
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </div>

        <RightSidebar agents={agents} agentSessions={agentSessions} />
      </main>

      <StatusBar />
    </div>
  );
}
