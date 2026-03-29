#!/usr/bin/env node
/**
 * VexOS Daily Standup Runner
 *
 * Asks each OpenClaw agent their standup status in parallel,
 * formats a markdown log, saves it, and delivers a summary via telegram.
 *
 * Usage:
 *   npx tsx scripts/run-standup.ts
 *
 * To schedule:
 *   openclaw cron add --name standup --schedule "0 9 * * *" --command "npx ts-node /Users/trititi/Projects/vex-os/scripts/run-standup.ts"
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const AGENTS = ['main', 'gary', 'vi'] as const;
type AgentId = (typeof AGENTS)[number];

const STANDUP_QUESTION =
  'Daily standup: What are you working on today? Any blockers? Plans for today?';

const TIMEOUT_MS = 60_000;
const STANDUPS_DIR = path.join(os.homedir(), '.openclaw', 'workspace', 'standups');

interface AgentResult {
  id: AgentId;
  response: string;
  ok: boolean;
}

function askAgent(agentId: AgentId): Promise<AgentResult> {
  return new Promise((resolve) => {
    const child = spawn('openclaw', [
      'agent',
      '--agent', agentId,
      '--message', STANDUP_QUESTION,
      '--json',
    ]);

    const timer = setTimeout(() => {
      child.kill();
      resolve({
        id: agentId,
        response: `[TIMEOUT] Agent ${agentId} did not respond within 60 seconds.`,
        ok: false,
      });
    }, TIMEOUT_MS);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        resolve({
          id: agentId,
          response: `[ERROR] Agent ${agentId} exited with code ${code}.${stderr.trim() ? ` ${stderr.trim()}` : ''}`,
          ok: false,
        });
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as Record<string, unknown>;
        // openclaw agent --json returns: { result: { payloads: [{ text, mediaUrl }] } }
        const payloads = (parsed.result as Record<string, unknown>)?.payloads as Array<{ text: string }> | undefined;
        const text =
          payloads?.[0]?.text ??
          (typeof parsed.response === 'string' ? parsed.response : null) ??
          (typeof parsed.message === 'string' ? parsed.message : null) ??
          (typeof parsed.text === 'string' ? parsed.text : null) ??
          stdout.trim();
        resolve({ id: agentId, response: text, ok: true });
      } catch {
        const trimmed = stdout.trim();
        resolve({
          id: agentId,
          response: trimmed || `[ERROR] Agent ${agentId} returned no output.`,
          ok: trimmed.length > 0,
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        id: agentId,
        response: `[ERROR] Failed to spawn agent ${agentId}: ${err.message}`,
        ok: false,
      });
    });
  });
}

async function sendSummary(summary: string): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn('openclaw', [
      'agent',
      '--agent', 'main',
      '--message', `Here are todays standup notes: ${summary}`,
      '--deliver',
      '--channel', 'telegram',
    ]);

    const timer = setTimeout(() => { child.kill(); resolve(); }, 30_000);

    child.on('close', () => { clearTimeout(timer); resolve(); });
    child.on('error', () => { clearTimeout(timer); resolve(); });
  });
}

async function main(): Promise<void> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  console.log(`\n▶ Daily Standup — ${dateStr} @ ${timeStr}`);
  console.log('─'.repeat(50));
  console.log(`  Polling agents: ${AGENTS.join(', ')}\n`);

  const results = await Promise.all(AGENTS.map(askAgent));

  const mdLines: string[] = [
    `# Daily Standup — ${dateStr}`,
    ``,
    `> Generated at ${timeStr} by vex-os standup runner`,
    ``,
    `---`,
    ``,
  ];

  // Agent display names
  const AGENT_NAMES: Record<AgentId, string> = {
    main: 'Vex ⚡',
    gary: 'Gary 🎯',
    vi: 'Vi 🔪',
  };

  const summaryParts: string[] = [
    `📋 Daily Standup — ${dateStr}`,
    ``,
  ];

  for (const { id, response, ok } of results) {
    const badge = ok ? '' : ' ⚠';
    mdLines.push(`## Agent: ${id}${badge}`);
    mdLines.push(``);
    mdLines.push(response);
    mdLines.push(``);
    mdLines.push(`---`);
    mdLines.push(``);

    const cleanResponse = response.trim();
    summaryParts.push(`— ${AGENT_NAMES[id]}`);
    summaryParts.push(ok ? cleanResponse : `_${cleanResponse}_`);
    summaryParts.push(``);

    console.log(`  [${ok ? '✓' : '✗'}] ${id}: ${response.split('\n')[0].slice(0, 80)}`);
  }

  summaryParts.push(`_${results.filter(r => r.ok).length}/${results.length} agents responded_`);

  const markdown = mdLines.join('\n');
  const summary = summaryParts.join('\n');

  await fs.mkdir(STANDUPS_DIR, { recursive: true });
  const filePath = path.join(STANDUPS_DIR, `${dateStr}.md`);
  await fs.writeFile(filePath, markdown, 'utf8');

  console.log(`\n✓ Saved: ${filePath}\n`);
  console.log(markdown);

  console.log('→ Sending summary to main agent via telegram...');
  await sendSummary(summary);
  console.log('✓ Delivered.\n');
}

main().catch((err: unknown) => {
  console.error('Standup runner failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
