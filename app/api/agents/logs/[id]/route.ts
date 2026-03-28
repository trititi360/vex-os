import { execSync } from 'child_process'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

interface LogEntry {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp?: number
}

interface SessionHistory {
  messages?: LogEntry[]
  turns?: LogEntry[]
  history?: LogEntry[]
}

function extractLogs(raw: string): string[] {
  let parsed: SessionHistory | LogEntry[]
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Not JSON — return raw lines as-is
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  }

  const messages: LogEntry[] = Array.isArray(parsed)
    ? parsed
    : (parsed.messages ?? parsed.turns ?? parsed.history ?? [])

  return messages.map((m) => {
    const prefix = m.role ? `[${m.role}] ` : ''
    const content =
      typeof m.content === 'string'
        ? m.content
        : JSON.stringify(m.content)
    return `${prefix}${content}`.trim()
  })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sessionKey = decodeURIComponent(id)

  if (!sessionKey) {
    return Response.json(
      { error: 'Missing session id' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  let logs: string[]
  try {
    const raw = execSync(
      `openclaw sessions history --session-key ${JSON.stringify(sessionKey)} --json`,
      { timeout: 8_000, encoding: 'utf8' }
    )
    logs = extractLogs(raw.trim() || '[]')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json(
      { error: 'Failed to fetch logs', detail: message },
      { status: 502, headers: CORS_HEADERS }
    )
  }

  return Response.json({ id: sessionKey, logs }, { headers: CORS_HEADERS })
}
