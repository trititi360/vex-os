import { execSync } from 'child_process'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

interface GatewaySession {
  agentId: string
  key: string
  sessionId: string
  updatedAt: number
  age: number
  abortedLastRun: boolean
  totalTokens: number
  totalTokensFresh?: boolean
  model: string
  flags?: string[]
}

interface GatewayStatus {
  sessions?: {
    recent?: GatewaySession[]
  }
}

interface Agent {
  id: string
  name: string
  status: 'running' | 'idle' | 'done' | 'error'
  task: string
  startTime: number
  elapsedMs: number
  logs: string[]
  tokensUsed: number
}

function inferStatus(session: GatewaySession): Agent['status'] {
  if (session.abortedLastRun) return 'error'
  if (session.age < 10_000) return 'running'
  if (session.age < 300_000) return 'idle'
  return 'done'
}

function inferTask(key: string): string {
  if (key.includes('telegram:slash')) return 'Telegram slash command'
  if (key.includes('telegram')) return 'Telegram session'
  if (key.endsWith(':main')) return 'Main agent session'
  return key
}

function normalizeSession(session: GatewaySession): Agent {
  const startTime = session.updatedAt - session.age
  return {
    id: session.key,
    name: session.agentId,
    status: inferStatus(session),
    task: inferTask(session.key),
    startTime,
    elapsedMs: session.age,
    logs: [],
    tokensUsed: session.totalTokens ?? 0,
  }
}

function fetchFromGateway(): Agent[] {
  const raw = execSync('openclaw gateway call status --json', {
    timeout: 5_000,
    encoding: 'utf8',
  })
  const data: GatewayStatus = JSON.parse(raw)
  const sessions = data?.sessions?.recent ?? []
  return sessions.map(normalizeSession)
}

const MOCK_AGENTS: Agent[] = [
  {
    id: 'mock:agent:1',
    name: 'main',
    status: 'idle',
    task: 'Main agent session',
    startTime: Date.now() - 3_600_000,
    elapsedMs: 3_600_000,
    logs: [],
    tokensUsed: 12_000,
  },
  {
    id: 'mock:agent:2',
    name: 'main',
    status: 'done',
    task: 'Telegram slash command',
    startTime: Date.now() - 86_400_000,
    elapsedMs: 86_400_000,
    logs: [],
    tokensUsed: 300,
  },
]

export async function GET() {
  let agents: Agent[]
  try {
    agents = fetchFromGateway()
  } catch {
    agents = MOCK_AGENTS
  }

  return Response.json(agents, { headers: CORS_HEADERS })
}
