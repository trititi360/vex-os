import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

// Voice per agent
const AGENT_VOICES: Record<string, string> = {
  main: 'am_onyx',
  gary: 'am_puck',
  vi: 'af_nova',
};
const DEFAULT_VOICE = 'am_michael';

const KOKORO_DIR = '/Users/trititi/kokoro';

function synthesize(text: string, voice: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = `
import sys, os
os.chdir('${KOKORO_DIR}')
from kokoro_onnx import Kokoro
import soundfile as sf
k = Kokoro('kokoro-v1.0.onnx', 'voices-v1.0.bin')
samples, sr = k.create(sys.argv[1], voice=sys.argv[2], speed=1.0, lang='en-us')
sf.write(sys.argv[3], samples, sr)
`;
    const child = spawn('python3', ['-c', script, text, voice, outPath]);
    let stderr = '';
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Kokoro failed (${code}): ${stderr.slice(0, 200)}`));
    });
    child.on('error', reject);
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text: string; agentId?: string; voice?: string };
    const { text, agentId, voice } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    const selectedVoice = voice ?? (agentId ? AGENT_VOICES[agentId] : null) ?? DEFAULT_VOICE;
    const outPath = join(tmpdir(), `tts-${randomUUID()}.wav`);

    await synthesize(text.slice(0, 1000), selectedVoice, outPath);

    const audioBuffer = await fs.readFile(outPath);
    await fs.unlink(outPath).catch(() => {});

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audioBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS failed' },
      { status: 500 }
    );
  }
}
