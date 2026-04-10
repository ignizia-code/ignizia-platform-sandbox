import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { audio } = (await request.json()) as { audio?: string };

    if (!audio) {
      return NextResponse.json({ error: 'Invalid request: audio data required' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(audio, 'base64');
    const file = await toFile(audioBuffer, 'voice-input.webm', { type: 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      model: 'gpt-4o-transcribe',
      file,
      response_format: 'json',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('Error calling OpenAI transcription API:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio', details: String(error) }, { status: 500 });
  }
}

