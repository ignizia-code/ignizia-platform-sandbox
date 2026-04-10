import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userMessage, systemPrompt } = await request.json();

    if (!userMessage) {
      return NextResponse.json({ error: 'Invalid request: userMessage required' }, { status: 400 });
    }

    const response = await openai.responses.create({
      model: 'gpt-5-nano',
      input: [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      reasoning: { effort: 'medium' },
    });

    const anyResponse: any = response as any;
    const responseText =
      anyResponse.output_text ??
      anyResponse.output?.[0]?.content?.[0]?.text ??
      'Unable to process response';

    // attempt to parse the response as JSON so the client can render widgets
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {}

    return NextResponse.json({ response: responseText, parsed });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return NextResponse.json({ error: 'Failed to process request', details: String(error) }, { status: 500 });
  }
}
