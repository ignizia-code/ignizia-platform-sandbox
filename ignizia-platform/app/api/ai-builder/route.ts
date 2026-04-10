import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, agent } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request: messages required' }, { status: 400 });
    }

    // Build context about current agent state
    const currentAgentContext = agent && agent.nodes && agent.nodes.length > 0
      ? `\n\nCurrent workflow state:\n- Name: ${agent.name}\n- Nodes: ${agent.nodes.map((n: any) => n.name).join(', ') || 'none'}\n- Entry node: ${agent.entryNodeId || 'not set'}`
      : '\n\nThe canvas is currently empty.';

    // System prompt for AI Builder
    const AI_BUILDER_SYSTEM_PROMPT = `You are an AI workflow architect helping users design agent workflows for the Agent Studio.

## CRITICAL: Understanding the System

This system builds **workflows as directed acyclic graphs (DAGs)** where each node represents an LLM call or a condition.

### Node Types Available:

1. **Model Call Node** (type: "model-call")
   - Represents a single LLM call
   - Properties: id, name, description, prompt, outputSchema, inputs, position
   - The prompt can reference previous node outputs using: {{nodes.nodeId.fieldName}} or {{input}} for user input
   - Must define an outputSchema (JSON schema) for structured output

2. **Conditional Node** (type: "conditional") 
   - Used for if/else branching
   - Properties: id, name, description, inputPath, condition, conditionValue, trueBranch, falseBranch, position
   - inputPath: JSON path like "$.fieldName" to extract value from previous node
   - condition: one of "==", "!=", "exists", "contains"
   - conditionValue: the value to compare against
   - trueBranch/falseBranch: node IDs to execute

### Entry Node:
- ONE node must be set as the entry point (entryNodeId)
- This is where workflow execution starts
- Usually the first processing node

### Connections:
- Connections define execution order
- Format: { from: "nodeId1", to: "nodeId2", type: "default" | "true" | "false" }

## Your Role:

1. **Understand** what the user wants to build
2. **Design** a workflow with appropriate nodes
3. **Respond with JSON** when you have enough information to build a workflow

## Response Format:

When you have enough information, respond with a JSON block wrapped in \\\`\\\`\\\`json ... \\\`\\\`\\\` containing:

\\\`\\\`\\\`json
{
  "workflow": {
    "name": "Agent Name",
    "description": "What this agent does",
    "nodes": [...],
    "connections": [...],
    "entryNodeId": "first-node-id"
  },
  "explanation": "Brief explanation of the workflow"
}
\\\`\\\`\\\`

If you need more information, just respond with text asking clarifying questions.

## Guidelines:

- Keep workflows simple and focused
- Use clear, descriptive node names
- Write prompts that are specific and instructive
- Define output schemas that capture all needed data
- Use conditionals only when branching logic is needed
- Position nodes for visual clarity (x: 200-400, y increases by ~150 per row)
- Generate unique IDs using kebab-case (e.g., "extract-intent", "check-sentiment")

Remember: You're helping build DETERMINISTIC workflows, not autonomous agents. Each node has a specific purpose and clear inputs/outputs.`;

    const conversationHistory: Message[] = messages.map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      max_completion_tokens: 2048,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: AI_BUILDER_SYSTEM_PROMPT + currentAgentContext
        },
        ...conversationHistory
      ],
    });

    const aiResponse = completion.choices[0].message.content || '';

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return NextResponse.json({ error: 'Failed to process request', details: String(error) }, { status: 500 });
  }
}
