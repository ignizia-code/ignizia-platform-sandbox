import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getDb, saveDb, queryAll, queryOne, updateUserLastAnalyzedComment } from '@/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL_VERSION = 'gpt-5-mini';

interface Comment {
  id: string;
  topic_id: string;
  author_id: string;
  text: string;
  created_at: string;
}

interface CommentAnalysis {
  comment_id: string;
  topic_id: string;
  author_id: string;
  relevance: 'on_topic' | 'loosely_related' | 'off_topic';
  tone: 'positive' | 'neutral' | 'negative' | 'aggressive';
  constructiveness: 'constructive' | 'low_value' | 'disruptive';
  short_reason?: string;
  model_version: string;
  created_at: string;
}

interface CommentWithAnalysis extends Comment {
  analysis?: CommentAnalysis;
}

async function analyzeComment(
  commentText: string,
  topicStarterText: string,
  recentContext?: string
): Promise<{
  relevance: 'on_topic' | 'loosely_related' | 'off_topic' | null;
  tone: 'positive' | 'neutral' | 'negative' | 'aggressive' | null;
  constructiveness: 'constructive' | 'low_value' | 'disruptive' | null;
  short_reason?: string;
}> {
  const prompt = `Classify ONE comment in a discussion.

Topic: "${topicStarterText}"

Recent comments (may be empty):
${recentContext || '(no previous comments)'}

Current comment: "${commentText}"

Return a SINGLE JSON object with these fields only:
- relevance: "on_topic" | "loosely_related" | "off_topic" | null
- tone: "positive" | "neutral" | "negative" | "aggressive" | null
- constructiveness: "constructive" | "low_value" | "disruptive" | null
- short_reason: short string explanation

If you REALLY cannot choose meaningful labels, set relevance, tone and constructiveness to null,
and in short_reason explain WHY you could not classify (for example: "short_reason": "Comment is too short / ambiguous to classify.").

Never return an empty object. Always include all four keys in the top-level JSON.

Example output when you CAN classify:
{"relevance":"on_topic","tone":"neutral","constructiveness":"constructive","short_reason":"Explains why AI summaries are helpful for this topic."}

Example output when you CANNOT classify:
{"relevance":null,"tone":null,"constructiveness":null,"short_reason":"Comment is just an emoji, cannot classify."}`;

  // Log the full prompt for debugging
  console.log('Comment analysis prompt:', prompt);

  // Primary call: structured output via JSON schema + strict
  const completion = await openai.chat.completions.create({
    model: MODEL_VERSION,
    max_completion_tokens: 1000,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'comment_analysis',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            relevance: {
              type: ['string', 'null'],
              enum: ['on_topic', 'loosely_related', 'off_topic', null],
            },
            tone: {
              type: ['string', 'null'],
              enum: ['positive', 'neutral', 'negative', 'aggressive', null],
            },
            constructiveness: {
              type: ['string', 'null'],
              enum: ['constructive', 'low_value', 'disruptive', null],
            },
            short_reason: { type: 'string' },
          },
          required: ['relevance', 'tone', 'constructiveness', 'short_reason'],
        },
      },
    },
    messages: [
      {
        role: 'system',
        content:
          'You are a comment analysis assistant. Analyze comments for relevance, tone, and constructiveness.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = completion.choices[0].message.content || '{}';
  // Log raw model output for debugging every time
  console.log('Comment analysis raw response:', responseText);
  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    console.error('Comment analysis JSON parse error:', e, 'raw:', responseText);
    parsed = {};
  }

  // Some models sometimes nest the result under an "analysis" key. Be tolerant but do NOT invent values.
  const candidate =
    parsed && typeof parsed === 'object'
      ? (parsed.analysis && typeof parsed.analysis === 'object' ? parsed.analysis : parsed)
      : {};

  return {
    // Do NOT apply semantic fallbacks: we want to see malformed / missing values.
    relevance:
      typeof candidate.relevance === 'string' && candidate.relevance.length > 0
        ? (candidate.relevance as any)
        : null,
    tone:
      typeof candidate.tone === 'string' && candidate.tone.length > 0
        ? (candidate.tone as any)
        : null,
    constructiveness:
      typeof candidate.constructiveness === 'string' && candidate.constructiveness.length > 0
        ? (candidate.constructiveness as any)
        : null,
    short_reason: typeof candidate.short_reason === 'string' ? candidate.short_reason : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const topicId = request.nextUrl.searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json({ error: 'topicId query parameter is required' }, { status: 400 });
    }

    const db = await getDb();
    const comments = queryAll<Comment>(
      db,
      `SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC`,
      [topicId]
    );

    const commentsWithAnalysis: CommentWithAnalysis[] = comments.map((comment) => {
      const analysis = queryOne<CommentAnalysis>(
        db,
        `SELECT * FROM comment_analyses WHERE comment_id = ?`,
        [comment.id]
      );
      return { ...comment, analysis: analysis || undefined };
    });

    return NextResponse.json({ comments: commentsWithAnalysis });
  } catch (error) {
    console.error('Comments API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const topicId = request.nextUrl.searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json({ error: 'topicId query parameter is required' }, { status: 400 });
    }

    const { author_id, text } = await request.json();

    if (!author_id || !text) {
      return NextResponse.json({ error: 'author_id and text are required' }, { status: 400 });
    }

    const db = await getDb();
    const topic = queryOne<{ starter_text: string }>(
      db,
      `SELECT starter_text FROM topics WHERE id = ?`,
      [topicId]
    );

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const recentComments = queryAll<{ text: string; author_id: string }>(
      db,
      `SELECT text, author_id FROM comments WHERE topic_id = ? ORDER BY created_at DESC LIMIT 5`,
      [topicId]
    );
    const recentContext =
      recentComments.length > 0
        ? recentComments
            .map(
              (c) =>
                `- ${c.author_id}: "${c.text.replace(/\s+/g, ' ').slice(0, 200)}"${
                  c.text.length > 200 ? '...' : ''
                }`
            )
            .join('\n')
        : '';

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const created_at = new Date().toISOString();

    db.run(
      `INSERT INTO comments (id, topic_id, author_id, text, created_at) VALUES (?, ?, ?, ?, ?)`,
      [commentId, topicId, author_id, text, created_at]
    );

    db.run(
      `UPDATE topics SET last_comment_id = ?, last_comment_at = ? WHERE id = ?`,
      [commentId, created_at, topicId]
    );

    const analysis = await analyzeComment(text, topic.starter_text, recentContext);

    db.run(
      `INSERT INTO comment_analyses (comment_id, topic_id, author_id, relevance, tone, constructiveness, short_reason, model_version, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commentId,
        topicId,
        author_id,
        analysis.relevance ?? null,
        analysis.tone ?? null,
        analysis.constructiveness ?? null,
        analysis.short_reason ?? null,
        MODEL_VERSION,
        created_at,
      ]
    );

    await updateUserLastAnalyzedComment(author_id, commentId);
    saveDb();

    const comment = queryOne<Comment>(db, `SELECT * FROM comments WHERE id = ?`, [commentId]);
    const savedAnalysis = queryOne<CommentAnalysis>(
      db,
      `SELECT * FROM comment_analyses WHERE comment_id = ?`,
      [commentId]
    );

    return NextResponse.json({ comment: { ...comment, analysis: savedAnalysis } }, { status: 201 });
  } catch (error) {
    console.error('Comments API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
