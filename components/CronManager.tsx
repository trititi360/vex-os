'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, Play, Pause, Calendar, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CronJob {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: {
    kind: string;
    expr?: string;
    tz?: string;
  };
  payload?: {
    kind: string;
    message?: string;
    timeoutSeconds?: number;
  };
  delivery?: {
    mode: string;
    channel?: string;
  };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
  };
}

// ─── Agent config ─────────────────────────────────────────────────────────────

const AGENT_CONFIG: Record<string, { name: string; emoji: string; color: string }> = {
  main: { name: 'Vex', emoji: '⚡', color: '#00d4ff' },
  gary: { name: 'Gary', emoji: '🎯', color: '#a855f7' },
  vi: { name: 'Vi', emoji: '🔪', color: '#00ff88' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNextRun(ms: number | undefined): string {
  if (!ms) return '—';
  const now = Date.now();
  const diff = ms - now;
  if (diff < 0) return 'overdue';
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `in ${days}d ${hrs % 24}h`;
  if (hrs > 0) return `in ${hrs}h ${mins % 60}m`;
  if (mins > 0) return `in ${mins}m`;
  return 'in <1m';
}

// ─── Cron card ────────────────────────────────────────────────────────────────

function CronCard({
  job,
  onToggle,
  toggling,
}: {
  job: CronJob;
  onToggle: (id: string, enabled: boolean) => void;
  toggling: boolean;
}) {
  const agent = AGENT_CONFIG[job.agentId] ?? {
    name: job.agentId,
    emoji: '🤖',
    color: '#6b7280',
  };

  return (
    <div
      className={`rounded-lg border bg-[#0a0a0e] p-3.5 transition-all ${
        job.enabled ? 'border-[#1a1a2e]' : 'border-[#111118] opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Agent indicator */}
        <div
          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-sm mt-0.5"
          style={{ backgroundColor: `${agent.color}10`, border: `1px solid ${agent.color}20` }}
        >
          {agent.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[11px] font-mono font-bold text-[#e0e0e0] tracking-wider">
              {job.name}
            </span>
            {job.enabled ? (
              <span className="text-[8px] font-mono font-bold text-[#00ff88] border border-[#00ff8830] rounded px-1 py-0.5 bg-[#00ff8808]">
                ENABLED
              </span>
            ) : (
              <span className="text-[8px] font-mono font-bold text-[#374151] border border-[#1a1a2e] rounded px-1 py-0.5">
                DISABLED
              </span>
            )}
          </div>

          {job.description && (
            <div className="text-[10px] font-mono text-[#374151] leading-relaxed mb-2 line-clamp-2">
              {job.description}
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {/* Schedule */}
            <div className="flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5 text-[#374151]" />
              <span className="text-[9px] font-mono text-[#4b5563]">
                {job.schedule.expr ?? job.schedule.kind}
              </span>
              {job.schedule.tz && (
                <span className="text-[9px] font-mono text-[#2a2a3e]">({job.schedule.tz})</span>
              )}
            </div>

            {/* Next run */}
            {job.enabled && (
              <div className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-[#374151]" />
                <span className="text-[9px] font-mono text-[#4b5563]">
                  next: {formatNextRun(job.state?.nextRunAtMs)}
                </span>
              </div>
            )}

            {/* Delivery */}
            {job.delivery?.channel && (
              <span className="text-[8px] font-mono text-[#2a2a3e] border border-[#111118] rounded px-1 py-0.5">
                → {job.delivery.channel}
              </span>
            )}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => onToggle(job.id, !job.enabled)}
          disabled={toggling}
          title={job.enabled ? 'Disable cron' : 'Enable cron'}
          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-bold tracking-wider transition-all border ${
            toggling
              ? 'opacity-50 cursor-not-allowed border-[#1a1a2e] text-[#374151]'
              : job.enabled
              ? 'border-[#ff4444]/30 text-[#ff4444] bg-[#ff4444]/5 hover:bg-[#ff4444]/15'
              : 'border-[#00ff88]/30 text-[#00ff88] bg-[#00ff88]/5 hover:bg-[#00ff88]/15'
          }`}
        >
          {toggling ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : job.enabled ? (
            <><Pause className="w-3 h-3" /> OFF</>
          ) : (
            <><Play className="w-3 h-3" /> ON</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── CronManager ─────────────────────────────────────────────────────────────

export default function CronManager() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadCrons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/crons');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { crons: CronJob[] };
      setJobs(data.crons ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load crons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCrons();
  }, [loadCrons]);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/crons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setJobs((prev) =>
        prev.map((j) => (j.id === id ? { ...j, enabled, updatedAtMs: Date.now() } : j))
      );
    } catch (e) {
      console.error('Toggle cron failed:', e);
    } finally {
      setTogglingId(null);
    }
  }, []);

  const enabledCount = jobs.filter((j) => j.enabled).length;

  return (
    <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-3.5 h-3.5 text-[#00d4ff]" />
        <span className="text-[10px] font-mono font-bold text-[#00d4ff] tracking-[0.2em]">
          CRON JOBS
        </span>
        <span className="text-[9px] font-mono text-[#2a2a3e]">
          ({enabledCount}/{jobs.length} active)
        </span>
        <button
          onClick={loadCrons}
          disabled={loading}
          className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#111118] border border-[#1a1a2e] text-[9px] font-mono text-[#374151] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-2.5 mb-3 rounded border border-[#ff4444]/20 bg-[#ff4444]/5 text-[9px] font-mono text-[#ff4444]">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Jobs */}
      {loading && jobs.length === 0 ? (
        <div className="flex items-center gap-2 text-[#374151] font-mono text-[10px]">
          <RefreshCw className="w-3 h-3 animate-spin" /> Loading crons...
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-[10px] font-mono text-[#374151] text-center py-3">
          No cron jobs configured
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <CronCard
              key={job.id}
              job={job}
              onToggle={handleToggle}
              toggling={togglingId === job.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
