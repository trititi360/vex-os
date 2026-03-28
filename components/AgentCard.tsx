'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Agent, AgentStatus } from '@/types/agent';

function formatElapsed(startTime: Date): string {
  const secs = Math.floor((Date.now() - startTime.getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatStartTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

type StatusConfig = {
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  cardBorder: string;
  icon: React.ReactNode;
};

const STATUS_CONFIG: Record<AgentStatus, StatusConfig> = {
  running: {
    label: 'RUNNING',
    textColor: 'text-[#00ff88]',
    bgColor: 'bg-[#00ff88]/10',
    borderColor: 'border-[#00ff88]/40',
    dotColor: 'bg-[#00ff88]',
    cardBorder: 'border-[#00ff88]/25',
    icon: <Activity className="w-3 h-3" />,
  },
  idle: {
    label: 'IDLE',
    textColor: 'text-[#ffaa00]',
    bgColor: 'bg-[#ffaa00]/10',
    borderColor: 'border-[#ffaa00]/40',
    dotColor: 'bg-[#ffaa00]',
    cardBorder: 'border-[#1a1a2e]',
    icon: <Clock className="w-3 h-3" />,
  },
  done: {
    label: 'DONE',
    textColor: 'text-[#44ff88]',
    bgColor: 'bg-[#44ff88]/10',
    borderColor: 'border-[#44ff88]/30',
    dotColor: 'bg-[#44ff88]',
    cardBorder: 'border-[#1a1a2e]',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  error: {
    label: 'ERROR',
    textColor: 'text-[#ff4444]',
    bgColor: 'bg-[#ff4444]/10',
    borderColor: 'border-[#ff4444]/40',
    dotColor: 'bg-[#ff4444]',
    cardBorder: 'border-[#ff4444]/25',
    icon: <XCircle className="w-3 h-3" />,
  },
};

function logLineColor(line: string): string {
  if (line.startsWith('✓')) return 'text-[#00ff88]';
  if (line.startsWith('✗')) return 'text-[#ff4444]';
  if (line.startsWith('⚠')) return 'text-[#ffaa00]';
  if (line.startsWith('>')) return 'text-[#00d4ff]';
  return 'text-[#4b5563]';
}

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const tick = () => setElapsed(formatElapsed(agent.startTime));
    tick();
    if (agent.status === 'running' || agent.status === 'idle') {
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
  }, [agent.startTime, agent.status]);

  const cfg = STATUS_CONFIG[agent.status];
  const isRunning = agent.status === 'running';
  const isError = agent.status === 'error';
  const visibleLogs = expanded ? agent.logs : agent.logs.slice(-2);

  return (
    <div
      className={`relative rounded-lg border bg-[#0a0a0e] p-4 transition-all duration-300 ${cfg.cardBorder} ${isRunning ? 'glow-green' : ''}`}
    >
      {/* Subtle scanline texture for running agents */}
      {isRunning && (
        <div
          className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.03]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,255,136,1) 3px, rgba(0,255,136,1) 4px)',
          }}
        />
      )}

      {/* Error corner accent */}
      {isError && (
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] border-t-transparent border-r-[#ff4444]/50 rounded-tr-lg" />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00d4ff] flex-shrink-0" />
          <span className="font-mono text-sm font-semibold text-[#e0e0e0] tracking-wider truncate">
            {agent.name}
          </span>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold flex-shrink-0 ${cfg.textColor} ${cfg.bgColor} ${cfg.borderColor}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dotColor} ${isRunning ? 'blink' : ''}`} />
          {cfg.icon}
          {cfg.label}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-[#374151] tracking-widest">PROGRESS</span>
          <span className={`text-[10px] font-mono font-bold ${cfg.textColor}`}>
            {agent.progress}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#111118] overflow-hidden">
          {isRunning ? (
            <div className="h-full rounded-full progress-shimmer" style={{ width: `${agent.progress}%` }} />
          ) : (
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                agent.status === 'done'
                  ? 'bg-[#44ff88]'
                  : agent.status === 'error'
                  ? 'bg-[#ff4444]'
                  : 'bg-[#ffaa00]'
              }`}
              style={{ width: `${agent.progress}%` }}
            />
          )}
        </div>
      </div>

      {/* ── Current task ── */}
      <div className="mb-3">
        <div className="text-[10px] font-mono text-[#374151] tracking-widest mb-1">CURRENT TASK</div>
        <p
          className={`text-xs font-mono leading-relaxed line-clamp-2 ${
            isError ? 'text-[#ff8888]' : isRunning ? 'text-[#9ca3af]' : 'text-[#6b7280]'
          }`}
          title={agent.currentTask}
        >
          {agent.currentTask}
        </p>
      </div>

      {/* ── Timing ── */}
      <div className="flex items-center gap-3 mb-3 text-[10px] font-mono">
        <div className="flex items-center gap-1 text-[#374151]">
          <Clock className="w-3 h-3" />
          <span>START {formatStartTime(agent.startTime)}</span>
        </div>
        <div className={`flex items-center gap-1 ${isRunning ? 'text-[#00ff88]' : 'text-[#374151]'}`}>
          <Zap className="w-3 h-3" />
          <span>{elapsed || '—'}</span>
        </div>
        <div className="ml-auto flex items-center gap-1 text-[#374151]">
          <Activity className="w-3 h-3" />
          <span>{(agent.tokenUsage / 1000).toFixed(1)}k tok</span>
        </div>
      </div>

      {/* ── Log output ── */}
      <div className="mb-2">
        <div className="text-[10px] font-mono text-[#374151] tracking-widest mb-1">LOG OUTPUT</div>
        <div className="rounded bg-[#050507] border border-[#111118] p-2 font-mono text-[11px] space-y-0.5">
          {visibleLogs.map((line, i) => (
            <div key={i} className={`leading-5 ${logLineColor(line)}`}>
              {line}
            </div>
          ))}
        </div>
      </div>

      {/* ── Expand toggle ── */}
      {agent.logs.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] font-mono text-[#374151] hover:text-[#00d4ff] transition-colors duration-150 mt-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              COLLAPSE
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              EXPAND (+{agent.logs.length - 2} lines)
            </>
          )}
        </button>
      )}
    </div>
  );
}
