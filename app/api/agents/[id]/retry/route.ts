import { NextResponse } from 'next/server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Wire to real OpenClaw gateway for live agent control
  // For now, this is a mock response since agents are simulated
  console.log(`[RETRY] Agent ${id} - retry requested`);

  return NextResponse.json({
    success: true,
    message: `Retry command sent to agent ${id}`,
    note: 'Using mock data - real agent control requires gateway wiring'
  });
}
