import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getDb, saveDb, queryAll, queryOne } from '@/lib/db';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL_VERSION = 'gpt-5-nano';

interface Topic {
  id: string;
  last_comment_id?: string;
  starter_text: string;
}

interface TopicAnalysisSnapshot {
  topic_id: string;
  computed_at: string;
  based_on_last_comment_id?: string;
  metrics_json: string;
  ai_json: string;
  model_version: string;
}

interface CommentAnalysis {
  comment_id: string;
  relevance: 'on_topic' | 'loosely_related' | 'off_topic';
  tone: 'positive' | 'neutral' | 'negative' | 'aggressive';
  constructiveness: 'constructive' | 'low_value' | 'disruptive';
}

interface Comment {
  id: string;
  author_id: string;
  created_at: string;
}

function computeMetrics(comments: Comment[]): {
  comment_count: number;
  unique_participants: number;
  comments_last_hour: number;
  comments_last_24h: number;
  time_to_first_reply_mins?: number;
} {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const uniqueAuthors = new Set(comments.map((c) => c.author_id));
  const commentsLastHour = comments.filter((c) => new Date(c.created_at) > oneHourAgo).length;
  const commentsLast24h = comments.filter((c) => new Date(c.created_at) > oneDayAgo).length;

  let timeToFirstReply: number | undefined;
  if (comments.length > 0) {
    const firstComment = comments[0];
    // Assuming topic created_at would be passed or computed differently
    // For now, we'll leave this as undefined in MVP
  }

  return {
    comment_count: comments.length,
    unique_participants: uniqueAuthors.size,
    comments_last_hour: commentsLastHour,
    comments_last_24h: commentsLast24h,
    time_to_first_reply_mins: timeToFirstReply,
  };
}

function computeFocusScore(analyses: CommentAnalysis[]): number {
  if (analyses.length === 0) return 1;

  const weights: Record<string, number> = {
    on_topic: 1,
    loosely_related: 0.5,
    off_topic: 0,
  };

  const sum = analyses.reduce((acc, a) => acc + (weights[a.relevance] || 0), 0);
  return sum / analyses.length;
}

function computeSentiment(analyses: CommentAnalysis[]): 'positive' | 'neutral' | 'negative' | 'mixed' {
  if (analyses.length === 0) return 'neutral';

  const counts = { positive: 0, neutral: 0, negative: 0, aggressive: 0 };
  analyses.forEach((a) => {
    counts[a.tone]++;
  });

  const total = analyses.length;
  const positiveRatio = counts.positive / total;
  const negativeRatio = (counts.negative + counts.aggressive) / total;

  if (positiveRatio > 0.6) return 'positive';
  if (negativeRatio > 0.6) return 'negative';
  if (positiveRatio > 0.3 && negativeRatio > 0.3) return 'mixed';
  return 'neutral';
}

function computeQuality(analyses: CommentAnalysis[]): 'low' | 'medium' | 'high' {
  if (analyses.length === 0) return 'medium';

  const constructiveCount = analyses.filter((a) => a.constructiveness === 'constructive').length;
  const ratio = constructiveCount / analyses.length;

  if (ratio > 0.7) return 'high';
  if (ratio > 0.4) return 'medium';
  return 'low';
}

export async function GET(request: NextRequest) {
  try {
    const topicId = request.nextUrl.searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json({ error: 'topicId query parameter is required' }, { status: 400 });
    }

    const db = await getDb();
    const topic = queryOne<Topic>(db, `SELECT * FROM topics WHERE id = ?`, [topicId]);
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    const snapshot = queryOne<TopicAnalysisSnapshot>(
      db,
      `SELECT * FROM topic_analysis_snapshots WHERE topic_id = ?`,
      [topicId]
    );

    const isStale = !snapshot || snapshot.based_on_last_comment_id !== topic.last_comment_id;

    if (snapshot) {
      const metrics = JSON.parse(snapshot.metrics_json);
      const ai_summary = JSON.parse(snapshot.ai_json);
      return NextResponse.json({
        snapshot: {
          topic_id: snapshot.topic_id,
          computed_at: snapshot.computed_at,
          based_on_last_comment_id: snapshot.based_on_last_comment_id,
          metrics,
          ai_summary,
          model_version: snapshot.model_version,
        },
        is_stale: isStale,
      });
    }
    return NextResponse.json({ snapshot: null, is_stale: true });
  } catch (error) {
    console.error('Topic analysis API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const topicId = request.nextUrl.searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json({ error: 'topicId query parameter is required' }, { status: 400 });
    }

    const db = await getDb();
    const topic = queryOne<Topic>(db, `SELECT * FROM topics WHERE id = ?`, [topicId]);
    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }
    const comments = queryAll<Comment>(
      db,
      `SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC LIMIT 200`,
      [topicId]
    );

    const analyses = queryAll<CommentAnalysis>(
      db,
      `SELECT * FROM comment_analyses WHERE topic_id = ? ORDER BY created_at DESC LIMIT 200`,
      [topicId]
    );

    const metrics = computeMetrics(comments);
    const ai_summary = {
        sentiment: computeSentiment(analyses),
        quality: computeQuality(analyses),
      focus_score: computeFocusScore(analyses),
    };

    const now = new Date().toISOString();

    const existing = queryOne<{ topic_id: string }>(
      db,
      `SELECT topic_id FROM topic_analysis_snapshots WHERE topic_id = ?`,
      [topicId]
    );

    if (existing) {
      db.run(
        `UPDATE topic_analysis_snapshots SET computed_at = ?, based_on_last_comment_id = ?, metrics_json = ?, ai_json = ?, model_version = ? WHERE topic_id = ?`,
        [now, topic.last_comment_id || null, JSON.stringify(metrics), JSON.stringify(ai_summary), MODEL_VERSION, topicId]
      );
    } else {
      db.run(
        `INSERT INTO topic_analysis_snapshots (topic_id, computed_at, based_on_last_comment_id, metrics_json, ai_json, model_version) VALUES (?, ?, ?, ?, ?, ?)`,
        [topicId, now, topic.last_comment_id || null, JSON.stringify(metrics), JSON.stringify(ai_summary), MODEL_VERSION]
      );
    }

    saveDb();

    return NextResponse.json({
      snapshot: {
        topic_id: topicId,
        computed_at: now,
        based_on_last_comment_id: topic.last_comment_id,
        metrics,
        ai_summary,
        model_version: MODEL_VERSION,
      },
      is_stale: false,
    });
  } catch (error) {
    console.error('Topic analysis API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
