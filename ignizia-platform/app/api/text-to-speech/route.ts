import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'alloy' } = (await request.json()) as { text?: string; voice?: string };

    if (!text) {
      return NextResponse.json({ error: 'Invalid request: text required' }, { status: 400 });
    }

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: text,
    });

    const buffer = await mp3.arrayBuffer();
    return new NextResponse(Buffer.from(buffer), { headers: { 'Content-Type': 'audio/mpeg' } });
  } catch (error) {
    console.error('Error calling OpenAI TTS API:', error);
    return NextResponse.json({ error: 'Failed to generate speech', details: String(error) }, { status: 500 });
  }
}
