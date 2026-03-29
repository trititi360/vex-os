'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Brain, RefreshCw, Search, Calendar, FileText, ChevronDown, ChevronUp, X } from 'lucide-react';
import StatusBar from '@/components/StatusBar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemoryFile {
  filename: string;
  path: string;
  content: string;
  date: string | null;
  size: number;
}

interface MemoryResponse {
  files: MemoryFile[];
  total: number;
}

// ─── Markdown section parser ──────────────────────────────────────────────────

interface Section {
  level: number;
  title: string;
  body: string;
}

function parseSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { level: headingMatch[1].length, title: headingMatch[2], body: '' };
    } else if (current) {
      current.body += line + '\n';
    } else {
      // Content before any heading
      if (!current) {
        current = { level: 0, title: '', body: '' };
      }
      current.body += line + '\n';
    }
  }
  if (current) sections.push(current);
  return sections.filter((s) => s.title || s.body.trim());
}

function renderMarkdownLine(line: string, idx: number): React.ReactNode {
  // Bold
  let processed = line;
  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  // Simple inline bold + code rendering
  const inlineRender = (text: string) => {
    const nodes: React.ReactNode[] = [];
    const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
    let last = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      if (m[1]) nodes.push(<strong key={m.index} className="text-[#e0e0e0] font-bold">{m[1]}</strong>);
      if (m[2]) nodes.push(<code key={m.index} className="bg-[#111118] border border-[#1a1a2e] rounded px-1 text-[#00d4ff] text-[11px]">{m[2]}</code>);
      last = regex.lastIndex;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
  };

  // Bullet list
  if (/^[-*]\s/.test(line)) {
    return (
      <div key={idx} className="flex items-start gap-2 text-[11px] font-mono text-[#9ca3af]">
        <span className="text-[#374151] mt-0.5 flex-shrink-0">▸</span>
        <span>{inlineRender(line.replace(/^[-*]\s/, ''))}</span>
      </div>
    );
  }
  // Numbered list
  if (/^\d+\.\s/.test(line)) {
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    return (
      <div key={idx} className="flex items-start gap-2 text-[11px] font-mono text-[#9ca3af]">
        <span className="text-[#374151] flex-shrink-0 w-4 text-right">{numMatch?.[1]}.</span>
        <span>{inlineRender(numMatch?.[2] ?? '')}</span>
      </div>
    );
  }
  // Empty line
  if (!line.trim()) return <div key={idx} className="h-1.5" />;
  // Horizontal rule
  if (/^---+$/.test(line.trim())) return <div key={idx} className="border-t border-[#1a1a2e] my-2" />;

  return (
    <div key={idx} className="text-[11px] font-mono text-[#9ca3af] leading-relaxed">
      {inlineRender(line)}
    </div>
  );
}

// ─── Memory file card ─────────────────────────────────────────────────────────

function MemoryCard({
  file,
  searchQuery,
  defaultOpen,
}: {
  file: MemoryFile;
  searchQuery: string;
  defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sections = useMemo(() => parseSections(file.content), [file.content]);

  const dateLabel = file.date
    ? new Date(file.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const isMemoryRoot = file.filename === 'MEMORY.md';
  const accentColor = isMemoryRoot ? '#a855f7' : '#00d4ff';

  // Filter sections by search query
  const filteredSections = searchQuery
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.body.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  if (searchQuery && filteredSections.length === 0) return null;

  return (
    <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#111118]/60 transition-colors text-left"
      >
        <FileText className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accentColor }} />
        <span className="text-sm font-mono font-bold text-[#e0e0e0] tracking-[0.08em] flex-1 truncate">
          {file.filename}
        </span>
        {dateLabel && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-[#374151] flex-shrink-0">
            <Calendar className="w-2.5 h-2.5" />
            {dateLabel}
          </span>
        )}
        <span className="text-[10px] font-mono text-[#2a2a3e] flex-shrink-0">
          {(file.size / 1024).toFixed(1)}kb
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#374151] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#374151] flex-shrink-0" />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-[#111118] px-4 py-4 space-y-4">
          {filteredSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.title && (
                <div
                  className={`font-mono font-bold tracking-wider mb-2 ${
                    section.level <= 1
                      ? 'text-sm'
                      : section.level === 2
                      ? 'text-[12px]'
                      : 'text-[11px]'
                  }`}
                  style={{
                    color:
                      section.level <= 1
                        ? accentColor
                        : section.level === 2
                        ? '#e0e0e0'
                        : '#9ca3af',
                    paddingLeft: section.level > 2 ? `${(section.level - 2) * 12}px` : undefined,
                  }}
                >
                  {section.level > 0 && (
                    <span className="text-[#2a2a3e] mr-1">
                      {'#'.repeat(section.level)}
                    </span>
                  )}
                  {searchQuery ? (
                    <HighlightText text={section.title} query={searchQuery} />
                  ) : (
                    section.title
                  )}
                </div>
              )}
              <div className="space-y-0.5 pl-0">
                {section.body
                  .split('\n')
                  .filter((_, i, arr) => !(i === 0 && arr[i] === '') )
                  .map((line, lIdx) => renderMarkdownLine(line, lIdx))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#a855f7]/30 text-[#e0e0e0] rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/memory');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as MemoryResponse;
      setFiles(data.files ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load memory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

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

      <main className="flex-1 flex flex-col px-6 py-8 max-w-3xl mx-auto w-full">
        {/* Title */}
        <div className="mb-8">
          <div className="text-[10px] font-mono text-[#374151] tracking-[0.3em] uppercase mb-2">
            VexOS · Memory
          </div>
          <div className="flex items-center gap-3 mb-3">
            <Brain className="w-5 h-5 text-[#a855f7]" />
            <h1 className="text-xl font-mono font-bold text-[#e0e0e0] tracking-[0.15em]">
              MEMORY VIEWER
            </h1>
            <button
              onClick={loadMemory}
              disabled={loading}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#111118] border border-[#1a1a2e] text-[10px] font-mono text-[#374151] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="w-32 h-px bg-gradient-to-r from-[#a855f7]/50 to-transparent" />
        </div>

        {/* Stats + Search */}
        <div className="mb-5 flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-[#374151]">
            <span>
              <span className="text-[#a855f7] font-bold">{files.length}</span> files
            </span>
            <span className="text-[#2a2a3e]">·</span>
            <span>
              <span className="text-[#374151]">{(totalSize / 1024).toFixed(1)}</span> kb total
            </span>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#374151]" />
            <input
              type="text"
              placeholder="Search memory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0a0e] border border-[#1a1a2e] rounded-lg pl-8 pr-8 py-1.5 text-[11px] font-mono text-[#e0e0e0] placeholder-[#2a2a3e] focus:outline-none focus:border-[#a855f7]/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#374151] hover:text-[#e0e0e0] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-[#ff4444]/30 bg-[#ff4444]/5 p-3 text-[11px] font-mono text-[#ff4444]">
            ERROR: {error}
          </div>
        )}

        {/* Files */}
        {loading ? (
          <div className="flex items-center gap-2 text-[#374151] font-mono text-xs mt-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading memory files...
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-8 text-center">
            <Brain className="w-6 h-6 text-[#1a1a2e] mx-auto mb-3" />
            <div className="text-[11px] font-mono text-[#374151]">No memory files found</div>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <MemoryCard
                key={file.filename}
                file={file}
                searchQuery={searchQuery}
                defaultOpen={file.filename === 'MEMORY.md' || files.length === 1}
              />
            ))}
          </div>
        )}
      </main>

      <StatusBar />
    </div>
  );
}
