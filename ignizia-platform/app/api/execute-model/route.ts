import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OutputSchema {
  type: string;
  properties?: Record<string, { type: string; description?: string }>;
  required?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { nodeName, nodeDescription, prompt, outputSchema } = await request.json();

    if (!prompt || !nodeName) {
      return NextResponse.json({ error: 'Invalid request: prompt and nodeName required' }, { status: 400 });
    }

    const systemPrompt = `You are an AI agent executing a workflow step named "${nodeName}".
Task description: ${nodeDescription}

You will receive a prompt with user input. Process it thoughtfully and provide a helpful, relevant response.

CRITICAL: You MUST respond with ONLY a valid JSON object matching this schema:
${JSON.stringify(outputSchema, null, 2)}

Rules:
- Output ONLY the JSON object, no markdown, no explanation, no code blocks
- Fill in all required fields with meaningful content based on the input
- Be helpful and provide substantive responses`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      max_completion_tokens: 2048,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
    });

    const responseText = completion.choices[0].message.content || '{}';

    // Parse JSON response, handling potential markdown code blocks
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.slice(7);
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    try {
      const parsedOutput = JSON.parse(cleanedResponse);
      return NextResponse.json({ output: parsedOutput });
    } catch {
      return NextResponse.json({ output: { rawResponse: responseText, parseError: true } });
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return NextResponse.json({ error: 'Failed to process request', details: String(error) }, { status: 500 });
  }
}
