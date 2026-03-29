'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Zap, Clock, MessageSquare, Cpu, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import StatusBar from '@/components/StatusBar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionDetail {
  sessionKey: string;
  sessionId: string;
  agentId: string;
  status: 'running' | 'done' | 'idle' | 'error';
  model?: string;
  totalTokens: number;
  estimatedCostUsd?: number;
  updatedAt: number;
  startedAt?: number;
  compactionCount?: number;
  lastChannel?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheRead?: number;
  title?: string;
  fullPrompt?: string;
  lastMessage?: string;
}

// ─── Agent config ─────────────────────────────────────────────────────────────

const AGENT_CONFIG: Record<string, { name: string; emoji: string; color: string }> = {
  main: { name: 'Vex', emoji: '⚡', color: '#00d4ff' },
  gary: { name: 'Gary', emoji: '🎯', color: '#a855f7' },
  vi: { name: 'Vi', emoji: '🔪', color: '#00ff88' },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  running: { color: '#00ff88', bg: '#00ff8810', label: 'RUNNING' },
  idle: { color: '#ffaa00', bg: '#ffaa0010', label: 'IDLE' },
  done: { color: '#44ff88', bg: '#44ff8810', label: 'DONE' },
  error: { color: '#ff4444', bg: '#ff444410', label: 'ERROR' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(usd: number | undefined): string | null {
  if (usd === undefined || usd === null) return null;
  if (usd < 0.001) return '<$0.001';
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function shortSessionKey(key: string): string {
  const parts = key.split(':');
  return parts.slice(2).join(':') || key;
}

function modelShort(model: string | undefined): string {
  if (!model) return 'unknown';
  // anthropic/claude-sonnet-4-6 → claude-sonnet-4-6
  // ollama/glm-4.7-flash → glm-4.7-flash
  return model.includes('/') ? model.split('/').slice(1).join('/') : model;
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: SessionDetail }) {
  const [promptOpen, setPromptOpen] = useState(false);
  const agent = AGENT_CONFIG[session.agentId] ?? {
    name: session.agentId,
    emoji: '🤖',
    color: '#6b7280',
  };
  const status = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.idle;
  const cost = formatCost(session.estimatedCostUsd);
  const shortKey = shortSessionKey(session.sessionKey);
  const isSubagent = shortKey.includes('subagent');
  const hasFullPrompt = !!session.fullPrompt;
  const promptIsTruncated = hasFullPrompt && session.title && session.fullPrompt !== session.title && session.fullPrompt!.length > session.title.length;

  return (
    <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-4 hover:border-[#2a2a3e] transition-colors">
      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        {/* Agent avatar */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
          style={{ backgroundColor: `${agent.color}10`, border: `1px solid ${agent.color}25` }}
        >
          {agent.emoji}
        </div>

        {/* Agent + session key */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[12px] font-mono font-bold" style={{ color: agent.color }}>
              {agent.name}
            </span>
            {isSubagent && (
              <span className="text-[9px] font-mono text-[#374151] border border-[#1a1a2e] rounded px-1 py-0.5">
                SUBAGENT
              </span>
            )}
            <span className="text-[9px] font-mono text-[#2a2a3e] truncate max-w-[180px]">
              {shortKey}
            </span>
          </div>
          {/* Title — first user message / task prompt */}
          {session.title ? (
            <div className="flex items-start gap-1 mt-0.5">
              <span className="text-[11px] font-mono text-[#c0c0c0] leading-snug flex-1 min-w-0" style={{ wordBreak: 'break-word' }}>
                {session.title}{session.title.length >= 120 && !promptOpen ? '…' : ''}
              </span>
              {promptIsTruncated && (
                <button
                  onClick={() => setPromptOpen((o) => !o)}
                  className="flex-shrink-0 flex items-center gap-0.5 text-[9px] font-mono text-[#374151] hover:text-[#00d4ff] transition-colors ml-1"
                >
                  {promptOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          ) : (
            <div className="text-[9px] font-mono text-[#2a2a3e] truncate">
              {session.sessionId}
            </div>
          )}
        </div>

        {/* Status badge */}
        <div
          className="flex-shrink-0 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider flex items-center gap-1"
          style={{ color: status.color, backgroundColor: status.bg, border: `1px solid ${status.color}30` }}
        >
          {session.status === 'running' && (
            <span className="w-1.5 h-1.5 rounded-full blink" style={{ backgroundColor: status.color }} />
          )}
          {status.label}
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        {/* Model */}
        {session.model && (
          <div className="flex items-center gap-1.5">
            <Cpu className="w-2.5 h-2.5 text-[#374151]" />
            <span className="text-[10px] font-mono text-[#9ca3af]">{modelShort(session.model)}</span>
          </div>
        )}

        {/* Tokens */}
        <div className="flex items-center gap-1.5">
          <Zap className="w-2.5 h-2.5 text-[#ffaa00]" />
          <span className="text-[10px] font-mono text-[#9ca3af]">
            {formatTokens(session.totalTokens)} tokens
          </span>
        </div>

        {/* Cost */}
        {cost && (
          <div
            className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
            style={{
              color: '#ffaa00',
              backgroundColor: '#ffaa0010',
              border: '1px solid #ffaa0025',
            }}
          >
            {cost}
          </div>
        )}

        {/* Compactions */}
        {session.compactionCount !== undefined && session.compactionCount > 0 && (
          <span className="text-[9px] font-mono text-[#374151]">
            {session.compactionCount}× compacted
          </span>
        )}

        {/* Channel */}
        {session.lastChannel && (
          <span className="text-[9px] font-mono text-[#2a2a3e] border border-[#1a1a2e] rounded px-1 py-0.5">
            {session.lastChannel}
          </span>
        )}

        {/* Time */}
        <div className="ml-auto flex items-center gap-1.5">
          <Clock className="w-2.5 h-2.5 text-[#374151]" />
          <span className="text-[9px] font-mono text-[#374151]">
            {formatTime(session.updatedAt)}
          </span>
        </div>
      </div>

      {/* Token breakdown */}
      {(session.inputTokens || session.outputTokens) && (
        <div className="flex items-center gap-3 mb-3 text-[9px] font-mono text-[#374151]">
          <span>in: <span className="text-[#9ca3af]">{formatTokens(session.inputTokens ?? 0)}</span></span>
          <span>out: <span className="text-[#9ca3af]">{formatTokens(session.outputTokens ?? 0)}</span></span>
          {session.cacheRead !== undefined && session.cacheRead > 0 && (
            <span>cache: <span className="text-[#00d4ff]">{formatTokens(session.cacheRead)}</span></span>
          )}
        </div>
      )}

      {/* Full prompt drawer */}
      {promptOpen && session.fullPrompt && (
        <div className="border-t border-[#111118] pt-2.5 mt-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Terminal className="w-2.5 h-2.5 text-[#a855f7]" />
            <span className="text-[9px] font-mono text-[#a855f7] tracking-wider">FULL PROMPT</span>
          </div>
          <pre className="text-[10px] font-mono text-[#9ca3af] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto rounded bg-[#030305] border border-[#111118] p-3">
            {session.fullPrompt}
          </pre>
        </div>
      )}

      {/* Last message preview */}
      {session.lastMessage && (
        <div className="border-t border-[#111118] pt-2.5 mt-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MessageSquare className="w-2.5 h-2.5 text-[#374151]" />
            <span className="text-[9px] font-mono text-[#374151] tracking-wider">LAST RESPONSE</span>
          </div>
          <div className="text-[10px] font-mono text-[#4b5563] leading-relaxed line-clamp-3">
            {session.lastMessage}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'running' | 'idle' | 'done' | 'error';
type FilterAgent = 'all' | string;

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterAgent, setFilterAgent] = useState<FilterAgent>('all');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sessions-detail');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { sessions: SessionDetail[]; total: number };
      setSessions(data.sessions ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const id = setInterval(loadSessions, 15_000);
    return () => clearInterval(id);
  }, [loadSessions]);

  // Unique agent IDs
  const agentIds = [...new Set(sessions.map((s) => s.agentId))].sort();

  // Filter
  const filtered = sessions.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterAgent !== 'all' && s.agentId !== filterAgent) return false;
    return true;
  });

  // Stats
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  const totalCost = sessions.reduce((sum, s) => sum + (s.estimatedCostUsd ?? 0), 0);
  const runningCount = sessions.filter((s) => s.status === 'running').length;

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

      <main className="flex-1 flex flex-col px-6 py-8 max-w-4xl mx-auto w-full">
        {/* Title */}
        <div className="mb-8">
          <div className="text-[10px] font-mono text-[#374151] tracking-[0.3em] uppercase mb-2">
            VexOS · Sessions
          </div>
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5 text-[#00d4ff]" />
            <h1 className="text-xl font-mono font-bold text-[#e0e0e0] tracking-[0.15em]">
              SESSION LOG
            </h1>
            <button
              onClick={loadSessions}
              disabled={loading}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111118] border border-[#1a1a2e] text-[10px] font-mono text-[#374151] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="w-32 h-px bg-gradient-to-r from-[#00d4ff]/50 to-transparent" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'SESSIONS', value: String(sessions.length), color: '#e0e0e0' },
            { label: 'ACTIVE', value: String(runningCount), color: '#00ff88' },
            { label: 'TOKENS', value: formatTokens(totalTokens), color: '#ffaa00' },
            { label: 'COST', value: formatCost(totalCost) ?? '$0', color: '#a855f7' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-3 text-center"
            >
              <div className="text-lg font-mono font-bold" style={{ color }}>
                {value}
              </div>
              <div className="text-[9px] font-mono text-[#374151] tracking-widest mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {/* Status filter */}
          <div className="flex items-center gap-1">
            {(['all', 'running', 'idle', 'done', 'error'] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition-all border ${
                  filterStatus === s
                    ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
                    : 'bg-transparent border-[#1a1a2e] text-[#374151] hover:border-[#2a2a3e] hover:text-[#9ca3af]'
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-[#1a1a2e]" />

          {/* Agent filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterAgent('all')}
              className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition-all border ${
                filterAgent === 'all'
                  ? 'bg-[#a855f7]/10 border-[#a855f7]/30 text-[#a855f7]'
                  : 'bg-transparent border-[#1a1a2e] text-[#374151] hover:border-[#2a2a3e] hover:text-[#9ca3af]'
              }`}
            >
              ALL AGENTS
            </button>
            {agentIds.map((id) => {
              const cfg = AGENT_CONFIG[id] ?? { name: id, emoji: '🤖', color: '#6b7280' };
              return (
                <button
                  key={id}
                  onClick={() => setFilterAgent(id)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition-all border ${
                    filterAgent === id
                      ? 'border-opacity-30 text-current'
                      : 'bg-transparent border-[#1a1a2e] text-[#374151] hover:border-[#2a2a3e] hover:text-[#9ca3af]'
                  }`}
                  style={
                    filterAgent === id
                      ? {
                          backgroundColor: `${cfg.color}15`,
                          borderColor: `${cfg.color}40`,
                          color: cfg.color,
                        }
                      : undefined
                  }
                >
                  {cfg.emoji} {cfg.name.toUpperCase()}
                </button>
              );
            })}
          </div>

          <span className="ml-auto text-[10px] font-mono text-[#2a2a3e]">
            {filtered.length} of {sessions.length}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-[#ff4444]/30 bg-[#ff4444]/5 p-3 text-[11px] font-mono text-[#ff4444]">
            ERROR: {error}
          </div>
        )}

        {/* Sessions list */}
        {loading && sessions.length === 0 ? (
          <div className="flex items-center gap-2 text-[#374151] font-mono text-xs mt-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading sessions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-8 text-center">
            <Activity className="w-6 h-6 text-[#1a1a2e] mx-auto mb-3" />
            <div className="text-[11px] font-mono text-[#374151]">No sessions match filters</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((session) => (
              <SessionCard key={`${session.agentId}:${session.sessionId}`} session={session} />
            ))}
          </div>
        )}
      </main>

      <StatusBar />
    </div>
  );
}
