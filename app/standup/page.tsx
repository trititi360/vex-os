'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Play, RefreshCw, ChevronDown, ChevronUp, Clock, Volume2, VolumeX } from 'lucide-react';
import StatusBar from '@/components/StatusBar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StandupMeta {
  date: string;
  filename: string;
  preview: string;
}

interface StandupMessage {
  agentId: string;
  text: string;
}

interface StandupDetail {
  date: string;
  content: string;
  messages: StandupMessage[];
}

type JobStatus = 'idle' | 'running' | 'done' | 'error';

// ─── Agent config ─────────────────────────────────────────────────────────────

const AGENT_CONFIG: Record<string, { name: string; emoji: string; color: string; bg: string; border: string }> = {
  main: { name: 'Vex',  emoji: '⚡', color: '#00d4ff', bg: '#00d4ff08', border: '#00d4ff25' },
  gary: { name: 'Gary', emoji: '🎯', color: '#a855f7', bg: '#a855f708', border: '#a855f725' },
  vi:   { name: 'Vi',   emoji: '🔪', color: '#00ff88', bg: '#00ff8808', border: '#00ff8825' },
};
const DEFAULT_AGENT = { name: 'Agent', emoji: '🤖', color: '#6b7280', bg: '#6b728008', border: '#6b728025' };

// ─── TTS helpers ─────────────────────────────────────────────────────────────

async function fetchTTS(text: string, agentId: string): Promise<HTMLAudioElement> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, agentId }),
  });
  if (!res.ok) throw new Error('TTS failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  return new Audio(url);
}

// ─── Chat bubble ─────────────────────────────────────────────────────────────

function ChatBubble({
  message,
  isPlaying,
  onPlay,
  onStop,
  onSkip,
  isPlayingAll,
}: {
  message: StandupMessage;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onSkip: () => void;
  isPlayingAll: boolean;
}) {
  const cfg = AGENT_CONFIG[message.agentId] ?? DEFAULT_AGENT;

  return (
    <div className="flex items-start gap-3 group">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base mt-0.5"
        style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
      >
        {cfg.emoji}
      </div>

      {/* Bubble */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-mono font-bold" style={{ color: cfg.color }}>
            {cfg.name}
          </span>
          <span className="text-[9px] font-mono text-[#2a2a3e] tracking-wider">
            {message.agentId !== 'main' ? `@${message.agentId}` : '@vex'}
          </span>

          {/* Play / Stop button */}
          <button
            onClick={isPlaying ? onStop : onPlay}
            title={isPlaying ? 'Stop' : 'Play voice'}
            className={`ml-1 flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono transition-all border ${
              isPlaying
                ? 'opacity-100 text-[#ff4444] border-[#ff4444]/30 bg-[#ff4444]/10 hover:bg-[#ff4444]/20'
                : 'opacity-0 group-hover:opacity-100 text-[#374151] border-[#1a1a2e] bg-[#111118] hover:text-[#00d4ff] hover:border-[#00d4ff]/30'
            }`}
          >
            {isPlaying ? (
              <><VolumeX className="w-2.5 h-2.5" /> STOP</>
            ) : (
              <><Play className="w-2.5 h-2.5" /> PLAY</>
            )}
          </button>

          {/* Skip button — only shown while this message is playing during play-all */}
          {isPlaying && isPlayingAll && (
            <button
              onClick={onSkip}
              title="Skip to next"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono transition-all border text-[#ffaa00] border-[#ffaa00]/30 bg-[#ffaa00]/10 hover:bg-[#ffaa00]/20"
            >
              ⏭ SKIP
            </button>
          )}
        </div>

        {/* Message text */}
        <div
          className="rounded-lg px-4 py-3 text-sm font-mono text-[#d1d5db] leading-relaxed whitespace-pre-wrap"
          style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}

// ─── Standup chat view ────────────────────────────────────────────────────────

// Plays a single audio element to completion; resolves when done, stopped, or skipped.
// stopFn is called externally to cancel (just call audio.pause() from outside).
function playAudio(audio: HTMLAudioElement): { promise: Promise<void>; stop: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => { resolve = res; });
  let settled = false;
  const finish = () => { if (!settled) { settled = true; resolve(); } };
  audio.addEventListener('ended', finish, { once: true });
  // Only treat actual media errors as terminal, not pre-play errors
  audio.addEventListener('error', (e) => {
    const err = (e.target as HTMLAudioElement).error;
    if (err && err.code !== 0) finish();
  }, { once: true });
  audio.play().catch(finish);
  return { promise, stop: () => { audio.pause(); finish(); } };
}

function StandupChat({ detail }: { detail: StandupDetail }) {
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const stopCurrentRef = useRef<(() => void) | null>(null);
  const abortRef = useRef(false); // true = stop entire playAll sequence

  const stop = useCallback(() => {
    abortRef.current = true;
    stopCurrentRef.current?.();
    stopCurrentRef.current = null;
    setPlayingIdx(null);
    setIsPlayingAll(false);
  }, []);

  const playOne = useCallback(async (idx: number): Promise<void> => {
    const msg = detail.messages[idx];
    if (!msg) return;
    setPlayingIdx(idx);
    try {
      const audio = await fetchTTS(msg.text, msg.agentId);
      if (abortRef.current) return;
      const { promise, stop: stopFn } = playAudio(audio);
      stopCurrentRef.current = stopFn;
      await promise;
    } finally {
      stopCurrentRef.current = null;
      setPlayingIdx((prev) => (prev === idx ? null : prev));
    }
  }, [detail.messages]);

  const playAll = useCallback(async () => {
    if (isPlayingAll) { stop(); return; }
    abortRef.current = false;
    setIsPlayingAll(true);
    for (let i = 0; i < detail.messages.length; i++) {
      if (abortRef.current) break;
      await playOne(i);
      if (abortRef.current) break;
      await new Promise((r) => setTimeout(r, 350));
    }
    setIsPlayingAll(false);
    setPlayingIdx(null);
  }, [isPlayingAll, detail.messages, playOne, stop]);

  const skip = useCallback(() => {
    // stop current audio but don't abort the sequence
    stopCurrentRef.current?.();
    stopCurrentRef.current = null;
  }, []);

  useEffect(() => () => { abortRef.current = true; stopCurrentRef.current?.(); }, []);

  if (detail.messages.length === 0) {
    return (
      <pre className="text-[11px] font-mono text-[#9ca3af] whitespace-pre-wrap leading-relaxed overflow-auto max-h-[480px]">
        {detail.content}
      </pre>
    );
  }

  return (
    <div>
      {/* Play All button */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#111118]">
        <div className="text-[10px] font-mono text-[#374151] tracking-widest">
          {detail.messages.length} RESPONSES
        </div>
        <button
          onClick={playAll}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-[11px] tracking-wider transition-all border ${
            isPlayingAll
              ? 'bg-[#ff4444]/10 border-[#ff4444]/40 text-[#ff4444] hover:bg-[#ff4444]/20'
              : 'bg-[#a855f7]/10 border-[#a855f7]/40 text-[#a855f7] hover:bg-[#a855f7]/20'
          }`}
        >
          {isPlayingAll ? (
            <><VolumeX className="w-3.5 h-3.5" /> STOP PLAYBACK</>
          ) : (
            <><Volume2 className="w-3.5 h-3.5" /> PLAY ALL VOICES</>
          )}
        </button>
      </div>

      {/* Chat messages */}
      <div className="space-y-5">
        {detail.messages.map((msg, i) => (
          <ChatBubble
            key={i}
            message={msg}
            isPlaying={playingIdx === i}
            isPlayingAll={isPlayingAll}
            onPlay={() => { abortRef.current = false; playOne(i); }}
            onStop={stop}
            onSkip={skip}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StandupPage() {
  const [standups, setStandups] = useState<StandupMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>('idle');
  const [jobStartedAt, setJobStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, StandupDetail>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStandups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/standup');
      if (res.ok) {
        const data = await res.json() as { standups: StandupMeta[] };
        setStandups(data.standups ?? []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStandups(); }, [loadStandups]);

  // Elapsed timer
  useEffect(() => {
    if (jobStatus !== 'running' || jobStartedAt === null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - jobStartedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [jobStatus, jobStartedAt]);

  // Poll job status
  useEffect(() => {
    if (!jobId || jobStatus !== 'running') return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/standup?job=${jobId}`);
        if (!res.ok) return;
        const data = await res.json() as { status: string };
        if (data.status === 'done' || data.status === 'error' || data.status === 'unknown') {
          setJobStatus(data.status === 'done' ? 'done' : 'error');
          if (pollRef.current) clearInterval(pollRef.current);
          if (data.status === 'done') {
            await loadStandups();
            // Auto-expand today's standup when done
            const todayStr = new Date().toISOString().slice(0, 10);
            setExpandedDate(todayStr);
          }
        }
      } catch { /* silent */ }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId, jobStatus, loadStandups]);

  const runStandup = async () => {
    if (jobStatus === 'running') return;
    setJobStatus('running');
    setJobStartedAt(Date.now());
    setElapsed(0);
    try {
      const res = await fetch('/api/standup', { method: 'POST' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json() as { ok: boolean; jobId: string };
      setJobId(data.jobId);
    } catch {
      setJobStatus('error');
    }
  };

  const toggleExpand = async (date: string) => {
    if (expandedDate === date) { setExpandedDate(null); return; }
    setExpandedDate(date);
    if (!expandedDetails[date]) {
      try {
        const res = await fetch(`/api/standup/${date}`);
        if (res.ok) {
          const data = await res.json() as StandupDetail;
          setExpandedDetails((prev) => ({ ...prev, [date]: data }));
        }
      } catch { /* silent */ }
    }
  };

  const fmt = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExists = standups.some((s) => s.date === todayStr);

  return (
    <div className="min-h-screen bg-[#030305] flex flex-col text-[#e0e0e0] flex-1">
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.018]"
        aria-hidden="true"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.6) 2px, rgba(255,255,255,0.6) 4px)' }}
      />

      <main className="flex-1 flex flex-col px-6 py-8 max-w-3xl mx-auto w-full">
        {/* Title */}
        <div className="mb-8">
          <div className="text-[10px] font-mono text-[#374151] tracking-[0.3em] uppercase mb-2">VexOS · Meetings</div>
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-[#a855f7]" />
            <h1 className="text-xl font-mono font-bold text-[#e0e0e0] tracking-[0.15em]">DAILY STANDUP</h1>
            <button onClick={loadStandups} disabled={loading} className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111118] border border-[#1a1a2e] text-[10px] font-mono text-[#374151] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="w-32 h-px bg-gradient-to-r from-[#a855f7]/50 to-transparent" />
        </div>

        {/* Run panel */}
        <div className="mb-6 rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-mono font-bold text-[#e0e0e0] mb-1">Run Today&apos;s Standup</div>
              <div className="text-[10px] font-mono text-[#374151] leading-relaxed">
                Polls{' '}
                {Object.entries(AGENT_CONFIG).map(([id, cfg], i, arr) => (
                  <span key={id}>
                    <span style={{ color: cfg.color }}>{cfg.emoji} {cfg.name}</span>
                    {i < arr.length - 1 ? <span className="text-[#2a2a3e]"> · </span> : null}
                  </span>
                ))}
              </div>
              {todayExists && jobStatus === 'idle' && (
                <div className="mt-1.5 text-[10px] font-mono text-[#ffaa00]">⚠ Today&apos;s standup already exists — re-running will overwrite</div>
              )}
            </div>
            <button
              onClick={runStandup}
              disabled={jobStatus === 'running'}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono font-bold text-sm tracking-wider transition-all border ${
                jobStatus === 'running'
                  ? 'bg-[#00ff88]/5 border-[#00ff88]/20 text-[#00ff88]/40 cursor-not-allowed'
                  : 'bg-[#00ff88]/10 border-[#00ff88]/40 text-[#00ff88] hover:bg-[#00ff88]/20 hover:border-[#00ff88]/60 active:scale-95'
              }`}
            >
              {jobStatus === 'running' ? <><RefreshCw className="w-4 h-4 animate-spin" />RUNNING...</> : <><Play className="w-3.5 h-3.5" />RUN STANDUP</>}
            </button>
          </div>

          {jobStatus === 'running' && (
            <div className="mt-4 pt-4 border-t border-[#111118]">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#00ff88] blink flex-shrink-0" />
                <span className="text-[11px] font-mono text-[#00ff88] tracking-wider">MEETING IN PROGRESS...</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <Clock className="w-3 h-3 text-[#374151]" />
                  <span className="text-[11px] font-mono text-[#374151] tabular-nums">{fmt(elapsed)}</span>
                </div>
              </div>
            </div>
          )}
          {jobStatus === 'done' && (
            <div className="mt-4 pt-4 border-t border-[#111118] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
              <span className="text-[11px] font-mono text-[#00ff88]">STANDUP COMPLETE</span>
              <button onClick={() => setJobStatus('idle')} className="ml-auto text-[10px] font-mono text-[#374151] hover:text-[#00d4ff] transition-colors">dismiss</button>
            </div>
          )}
          {jobStatus === 'error' && (
            <div className="mt-4 pt-4 border-t border-[#111118] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff4444]" />
              <span className="text-[11px] font-mono text-[#ff4444]">STANDUP FAILED — check server logs</span>
              <button onClick={() => setJobStatus('idle')} className="ml-auto text-[10px] font-mono text-[#374151] hover:text-[#00d4ff] transition-colors">dismiss</button>
            </div>
          )}
        </div>

        {/* Past standups */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-mono font-bold text-[#a855f7] tracking-[0.2em]">PAST STANDUPS</span>
            {!loading && <span className="text-[10px] font-mono text-[#2a2a3e]">({standups.length})</span>}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-[#374151] font-mono text-xs mt-4">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading standups...
            </div>
          ) : standups.length === 0 ? (
            <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-8 text-center">
              <Calendar className="w-6 h-6 text-[#1a1a2e] mx-auto mb-3" />
              <div className="text-[11px] font-mono text-[#374151]">No standups yet — run your first one above</div>
            </div>
          ) : (
            <div className="space-y-2">
              {standups.map((standup) => {
                const isToday = standup.date === todayStr;
                const isExpanded = expandedDate === standup.date;
                const detail = expandedDetails[standup.date];

                return (
                  <div key={standup.date} className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#111118]/60 transition-colors text-left"
                      onClick={() => toggleExpand(standup.date)}
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#a855f7] flex-shrink-0" />
                      <span className="text-sm font-mono font-bold text-[#e0e0e0] tracking-[0.1em] flex-shrink-0">{standup.date}</span>
                      {isToday && <span className="text-[9px] font-mono text-[#00ff88] border border-[#00ff88]/30 rounded px-1.5 py-0.5 flex-shrink-0">TODAY</span>}
                      {standup.preview && <span className="text-[10px] font-mono text-[#374151] truncate flex-1 min-w-0">{standup.preview}</span>}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#374151] flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-[#374151] flex-shrink-0" />}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-[#111118] px-4 py-5">
                        {detail ? (
                          <StandupChat detail={detail} />
                        ) : (
                          <div className="flex items-center gap-2 text-[#374151] font-mono text-xs py-2">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Loading...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <StatusBar />
    </div>
  );
}
