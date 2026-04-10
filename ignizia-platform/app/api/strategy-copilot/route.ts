import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are the IGNIZIA Strategy Copilot for manufacturing executives.

## OUTPUT FORMAT — READ THIS FIRST

You have TWO possible output formats. Choose the correct one EVERY time.

### FORMAT A — When the leader wants to CREATE or CHANGE a strategy

Use this when the leader says anything like: "create a strategy", "increase throughput", "change target to X%", "make it 15%", "lower the goal", "edit the strategy", "reduce defects", "adjust guardrails", "make it more aggressive", etc.

You MUST output a JSON block FIRST, wrapped in triple-backtick json fences, using EXACTLY this schema:

\`\`\`json
{
  "action": "create" or "refine",
  "strategyName": "short name",
  "targetPercent": <number>,
  "guardrails": {
    "maxSpeed": <number>,
    "maxErrorRate": <number 0-1>,
    "maxDropCount": <number>,
    "emergencyStopThreshold": <number 0-1>
  },
  "automationLiftPercent": <number>,
  "summary": "1 sentence summary"
}
\`\`\`

After the JSON block, add a short plain-text explanation.

IMPORTANT: When an EXISTING STRATEGY CONTEXT is provided and the leader wants ANY change to numbers, targets, scope, or parameters — you MUST use action="refine" and return the JSON. Only change the fields the leader mentioned; keep all other fields identical to the existing values.

### FORMAT B — When the leader asks a QUESTION (no changes)

Use this when the leader asks "why?", "what should I prioritize?", "is it ready to scale?", etc. — questions that do NOT ask for parameter changes.

Reply with plain text only. No JSON. Structure your answer as:
Recommendation: ...
Why: ...
Signals used: ...
Blockers considered: ...
Tradeoffs: ...
Confidence: ...

## CONTEXT

You receive the full conversation history. Use it to understand what the leader discussed before and maintain continuity. Reference previous decisions and context naturally.

You may also receive:
- EXISTING STRATEGY CONTEXT — the current strategy parameters. When present and the leader asks for a change, you MUST use Format A with action="refine".
- ORGANIZATIONAL PROPAGATION STATE — domains, blockers, impact data. Use this as ground truth to inform your reasoning.

## RULES
- Keep language executive-level and concise.
- For refine: only change fields the leader mentioned.
- Do not use markdown headings or bullet lists — plain text paragraphs with the labels above.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ExistingStrategy {
  objectiveName: string;
  targetPercent: number;
  guardrails: {
    maxSpeed: number;
    maxErrorRate: number;
    maxDropCount: number;
    emergencyStopThreshold: number;
  };
  automationLiftPercent: number;
}

interface PropagationContext {
  domains: { name: string; unitCount: number; activeCount: number; blockedCount: number; notStartedCount: number; mainBlocker: string | null }[];
  totalUnits: number;
  activeUnits: number;
  blockedUnits: number;
  aggregateImpact: { throughput: number; defect: number; cost: number } | null;
  topBlockers: string[];
  unassignedAreas: string[];
  strongestDomain: string | null;
  weakestDomain: string | null;
}

function tryExtractJson(text: string): Record<string, unknown> | null {
  // Try fenced JSON first
  const fenced = text.match(/```json\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* continue */ }
  }

  // Try bare JSON object
  const bare = text.match(/\{[\s\S]*"action"\s*:\s*"(?:create|refine)"[\s\S]*\}/);
  if (bare) {
    try { return JSON.parse(bare[0]); } catch { /* continue */ }
  }

  return null;
}

function tryExtractTargetFromText(text: string, existing: ExistingStrategy): Record<string, unknown> | null {
  const targetMatch = text.match(/(?:target|goal)\s*(?:from\s+\+?\d+%?\s*)?(?:to|down to|up to)\s+\+?(\d+)\s*%/i)
    ?? text.match(/(?:update|change|set|adjust|refine|move)\s+(?:the\s+)?target\s+.*?(\d+)\s*%/i)
    ?? text.match(/(\d+)\s*%\s*target/i);

  if (targetMatch) {
    const newTarget = parseInt(targetMatch[1], 10);
    if (newTarget > 0 && newTarget <= 100 && newTarget !== existing.targetPercent) {
      return {
        action: 'refine',
        strategyName: existing.objectiveName,
        targetPercent: newTarget,
        guardrails: existing.guardrails,
        automationLiftPercent: existing.automationLiftPercent,
        summary: `Target updated from ${existing.targetPercent}% to ${newTarget}%.`,
      };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, existingStrategy, propagationContext } = (await request.json()) as {
      messages: ChatMessage[];
      existingStrategy: ExistingStrategy | null;
      propagationContext?: PropagationContext | null;
    };

    if (!messages?.length) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    let contextBlock = '';
    if (existingStrategy) {
      contextBlock += `\n\nEXISTING STRATEGY CONTEXT (you MUST use Format A with action="refine" if the leader asks for any change):\nName: ${existingStrategy.objectiveName}\nTarget: +${existingStrategy.targetPercent}%\nGuardrails: maxSpeed=${existingStrategy.guardrails.maxSpeed}, maxErrorRate=${existingStrategy.guardrails.maxErrorRate}, maxDropCount=${existingStrategy.guardrails.maxDropCount}, emergencyStop=${existingStrategy.guardrails.emergencyStopThreshold}\nAutomation lift: ${existingStrategy.automationLiftPercent}%`;
    }

    if (propagationContext) {
      const pc = propagationContext;
      contextBlock += `\n\nORGANIZATIONAL PROPAGATION STATE:\nTotal areas: ${pc.totalUnits} | Active: ${pc.activeUnits} | Blocked: ${pc.blockedUnits}`;
      if (pc.domains.length > 0) {
        contextBlock += '\nDomains:';
        for (const d of pc.domains) {
          contextBlock += `\n- ${d.name}: ${d.unitCount} units (${d.activeCount} active, ${d.blockedCount} blocked, ${d.notStartedCount} not started)`;
          if (d.mainBlocker) contextBlock += ` — Blocker: ${d.mainBlocker}`;
        }
      }
      if (pc.topBlockers.length > 0) {
        contextBlock += `\nActive blockers: ${pc.topBlockers.join('; ')}`;
      }
      if (pc.unassignedAreas.length > 0) {
        contextBlock += `\nUnassigned areas: ${pc.unassignedAreas.join(', ')}`;
      }
      if (pc.aggregateImpact) {
        contextBlock += `\nAggregate impact across active areas: throughput ${pc.aggregateImpact.throughput > 0 ? '+' : ''}${pc.aggregateImpact.throughput}%, defects ${pc.aggregateImpact.defect}%, cost ${pc.aggregateImpact.cost}%`;
      }
      if (pc.strongestDomain) {
        contextBlock += `\nStrongest domain: ${pc.strongestDomain}`;
      }
      if (pc.weakestDomain) {
        contextBlock += `\nWeakest / most at-risk domain: ${pc.weakestDomain}`;
      }
    }

    const input = [
      { role: 'system' as const, content: SYSTEM_PROMPT + contextBlock },
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const response = await openai.responses.create({
      model: 'gpt-4.1-nano',
      input,
    });

    const anyResponse = response as any;
    const responseText: string =
      anyResponse.output_text ??
      anyResponse.output?.[0]?.content?.[0]?.text ??
      '';

    let parsed = tryExtractJson(responseText);

    // Fallback: if existing strategy is present, the user asked for a change, but the LLM
    // didn't return JSON — try to extract target values from the response text.
    if (!parsed && existingStrategy) {
      const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? '';
      const editIntent = /(?:edit|change|update|set|adjust|lower|raise|increase|decrease|reduce|make it|move|refine|target)/i.test(lastUserMsg);
      if (editIntent) {
        parsed = tryExtractTargetFromText(responseText, existingStrategy)
          ?? tryExtractTargetFromText(lastUserMsg, existingStrategy);
      }
    }

    const plainText = responseText
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\{[\s\S]*"action"\s*:\s*"(?:create|refine)"[\s\S]*\}/g, '')
      .trim();

    return NextResponse.json({ response: plainText, parsed });
  } catch (error) {
    console.error('Strategy Copilot error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: String(error) },
      { status: 500 },
    );
  }
}
