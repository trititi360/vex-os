'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Save, RefreshCw, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentFile {
  name: string;
  path: string;
  content: string;
  lastModified: string;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  workspace: string;
  files: AgentFile[];
  isLoading: boolean;
  error?: string;
}

// No hardcoded agents — all loaded from /api/agents (which reads openclaw.json)

const FILE_ORDER = ['SOUL.md', 'IDENTITY.md', 'USER.md', 'AGENTS.md', 'TOOLS.md', 'HEARTBEAT.md', 'BOOTSTRAP.md', 'MEMORY.md'];

// ─── Components ───────────────────────────────────────────────────────────────

function FileEditor({ file, onSave }: { file: AgentFile; onSave: (content: string) => void }) {
  const [content, setContent] = useState(file.content);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update content when file changes
  useEffect(() => {
    setContent(file.content);
    setSaved(false);
  }, [file]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(content);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-sm font-mono font-bold text-[#e0e0e0]">{file.name}</span>
          <span className="text-[10px] font-mono text-[#374151]">
            {new Date(file.lastModified).toLocaleString()}
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || content === file.content}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-wider transition-all ${
            saved
              ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30'
              : content !== file.content
              ? 'bg-[#ffaa00]/20 text-[#ffaa00] border border-[#ffaa00]/30 hover:bg-[#ffaa00]/30'
              : 'bg-[#111118] text-[#374151] border border-[#1a1a2e] cursor-not-allowed'
          }`}
        >
          {saved ? (
            <>
              <CheckCircle className="w-3 h-3" />
              SAVED
            </>
          ) : isSaving ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              SAVING...
            </>
          ) : (
            <>
              <Save className="w-3 h-3" />
              SAVE
            </>
          )}
        </button>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-96 bg-[#0a0a0e] border border-[#1a1a2e] rounded-lg p-4 text-xs font-mono text-[#e0e0e0] resize-none focus:outline-none focus:border-[#00d4ff]/50"
        spellCheck={false}
      />
    </div>
  );
}

function AgentCard({ agent, onFileSave }: { agent: Agent; onFileSave: (agentId: string, fileName: string, content: string) => Promise<void> }) {
  const [selectedFile, setSelectedFile] = useState<AgentFile | null>(null);

  const sortedFiles = [...agent.files].sort((a, b) => {
    const aIndex = FILE_ORDER.indexOf(a.name);
    const bIndex = FILE_ORDER.indexOf(b.name);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  if (agent.isLoading) {
    return (
      <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{agent.emoji}</span>
          <div>
            <div className="text-sm font-mono font-bold text-[#e0e0e0]">{agent.name}</div>
            <div className="text-[10px] font-mono text-[#374151]">{agent.workspace}</div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 text-[#00d4ff] animate-spin" />
          <span className="ml-2 text-[10px] font-mono text-[#374151]">LOADING FILES...</span>
        </div>
      </div>
    );
  }

  if (agent.error) {
    return (
      <div className="rounded-lg border border-[#ff4444]/30 bg-[#ff4444]/5 p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{agent.emoji}</span>
          <div>
            <div className="text-sm font-mono font-bold text-[#e0e0e0]">{agent.name}</div>
            <div className="text-[10px] font-mono text-[#374151]">{agent.workspace}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#ff4444]">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-mono">{agent.error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1a1a2e] bg-[#0a0a0e] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a2e] bg-[#0f0f14]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{agent.emoji}</span>
          <div className="flex-1">
            <div className="text-sm font-mono font-bold text-[#e0e0e0]">{agent.name}</div>
            <div className="text-[10px] font-mono text-[#374151] flex items-center gap-1">
              <FolderOpen className="w-3 h-3" />
              {agent.workspace}
            </div>
          </div>
          <div className="text-[10px] font-mono text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-1 rounded">
            {agent.files.length} FILES
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex">
        {/* File list */}
        <div className="w-48 border-r border-[#1a1a2e] bg-[#08080a]">
          <div className="p-2">
            <div className="text-[9px] font-mono text-[#374151] tracking-wider mb-2 px-2">
              CONFIGURATION FILES
            </div>
            {sortedFiles.map((file) => (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-all ${
                  selectedFile?.name === file.name
                    ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/30'
                    : 'text-[#6b7280] hover:bg-[#111118] hover:text-[#e0e0e0]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  {file.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-4">
          {selectedFile ? (
            <FileEditor
              file={selectedFile}
              onSave={(content) => onFileSave(agent.id, selectedFile.name, content)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-[#374151]">
              <FileText className="w-8 h-8 mb-3 opacity-30" />
              <span className="text-xs font-mono">Select a file to edit</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAgents = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to load agents');
      const data = await response.json();
      setAgents(data.agents);
    } catch (error) {
      console.error('Error loading agents:', error);
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          isLoading: false,
          error: 'Failed to load files. Check API endpoint.',
        }))
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleFileSave = async (agentId: string, fileName: string, content: string) => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, fileName, content }),
      });
      if (!response.ok) throw new Error('Failed to save file');
      
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === agentId
            ? {
                ...agent,
                files: agent.files.map((f) =>
                  f.name === fileName ? { ...f, content } : f
                ),
              }
            : agent
        )
      );
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
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

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-6">
        {/* Page title */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-[#374151] tracking-[0.3em] uppercase mb-2">
              VexOS · Configuration
            </div>
            <h1 className="text-xl font-mono font-bold text-[#e0e0e0] tracking-[0.15em]">
              Agent Configuration Editor
            </h1>
            <div className="mt-3 w-32 h-px bg-gradient-to-r from-[#00d4ff] to-transparent" />
          </div>
          <button
            onClick={loadAgents}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#111118] border border-[#1a1a2e] text-[10px] font-mono text-[#374151] hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>

        {/* Agent cards */}
        <div className="space-y-6">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onFileSave={handleFileSave} />
          ))}
        </div>

        {/* Info footer */}
        <div className="mt-8 p-4 rounded-lg border border-[#1a1a2e] bg-[#0a0a0e]/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#ffaa00] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-mono font-bold text-[#e0e0e0] mb-1">
                About Agent Configuration Files
              </div>
              <div className="text-[10px] font-mono text-[#374151] leading-relaxed">
                <strong className="text-[#6b7280]">SOUL.md</strong> — Agent personality and behavior traits<br />
                <strong className="text-[#6b7280]">IDENTITY.md</strong> — Name, avatar, and basic identity<br />
                <strong className="text-[#6b7280]">USER.md</strong> — Information about you (the human)<br />
                <strong className="text-[#6b7280]">AGENTS.md</strong> — Workspace configuration and red lines<br />
                <strong className="text-[#6b7280]">TOOLS.md</strong> — Local tool configurations and preferences<br />
                <strong className="text-[#6b7280]">HEARTBEAT.md</strong> — Periodic task definitions
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
