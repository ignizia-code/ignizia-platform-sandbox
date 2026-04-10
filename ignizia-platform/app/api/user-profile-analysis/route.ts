import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, queryAll, queryOne, getUserLastAnalyzedCommentId } from '@/lib/db';

const MODEL_VERSION = 'gpt-5-nano';

interface CommentAnalysis {
  comment_id: string;
  topic_id: string;
  relevance: 'on_topic' | 'loosely_related' | 'off_topic';
  tone: 'positive' | 'neutral' | 'negative' | 'aggressive';
  constructiveness: 'constructive' | 'low_value' | 'disruptive';
  created_at: string;
}

interface UserProfileSnapshot {
  user_id: string;
  computed_at: string;
  based_on_last_analyzed_comment_id?: string;
  labels_json: string;
  model_version: string;
}

interface UserLabel {
  key: string;
  score: number;
  description: string;
  evidence_comment_ids: string[];
}

function computeLabels(analyses: CommentAnalysis[]): UserLabel[] {
  if (analyses.length === 0) return [];

  const labels: UserLabel[] = [];
  const total = analyses.length;

  // Constructive contributor: constructive + on_topic
  const constructiveOnTopic = analyses.filter(
    (a) => a.constructiveness === 'constructive' && a.relevance === 'on_topic'
  );
  if (constructiveOnTopic.length > 0) {
    const score = Math.round((constructiveOnTopic.length / total) * 100);
    if (score >= 10) {
      labels.push({
        key: 'constructive_contributor',
        score,
        description: 'Provides constructive and on-topic comments',
        evidence_comment_ids: constructiveOnTopic.slice(0, 20).map((a) => a.comment_id),
      });
    }
  }

  // Often off-topic
  const offTopic = analyses.filter((a) => a.relevance === 'off_topic');
  if (offTopic.length > 0) {
    const score = Math.round((offTopic.length / total) * 100);
    if (score >= 15) {
      labels.push({
        key: 'often_off_topic',
        score,
        description: 'Frequently posts off-topic comments',
        evidence_comment_ids: offTopic.slice(0, 20).map((a) => a.comment_id),
      });
    }
  }

  // Frequently negative tone
  const negative = analyses.filter((a) => a.tone === 'negative' || a.tone === 'aggressive');
  if (negative.length > 0) {
    const score = Math.round((negative.length / total) * 100);
    if (score >= 15) {
      labels.push({
        key: 'frequently_negative',
        score,
        description: 'Often uses negative or aggressive tone',
        evidence_comment_ids: negative.slice(0, 20).map((a) => a.comment_id),
      });
    }
  }

  // Low-value commenter
  const lowValue = analyses.filter((a) => a.constructiveness === 'low_value');
  if (lowValue.length > 0) {
    const score = Math.round((lowValue.length / total) * 100);
    if (score >= 20) {
      labels.push({
        key: 'low_value_commenter',
        score,
        description: 'Frequently posts low-value comments',
        evidence_comment_ids: lowValue.slice(0, 20).map((a) => a.comment_id),
      });
    }
  }

  // Disruptive
  const disruptive = analyses.filter(
    (a) => a.constructiveness === 'disruptive' || a.tone === 'aggressive'
  );
  if (disruptive.length > 0) {
    const score = Math.round((disruptive.length / total) * 100);
    if (score >= 10) {
      labels.push({
        key: 'disruptive',
        score,
        description: 'Exhibits disruptive or aggressive behavior',
        evidence_comment_ids: disruptive.slice(0, 20).map((a) => a.comment_id),
      });
    }
  }

  // Balanced participant (positive balance)
  const positive = analyses.filter((a) => a.tone === 'positive');
  const neutral = analyses.filter((a) => a.tone === 'neutral');
  if (positive.length > 0 || neutral.length > 0) {
    const balancedScore = Math.round(((positive.length + neutral.length) / total) * 100);
    if (balancedScore >= 60 && negative.length / total < 0.2) {
      labels.push({
        key: 'balanced_participant',
        score: balancedScore,
        description: 'Maintains a balanced and positive presence',
        evidence_comment_ids: [...positive, ...neutral].slice(0, 20).map((a) => a.comment_id),
      });
    }
  }

  // Sort by score descending and limit to 6
  return labels.sort((a, b) => b.score - a.score).slice(0, 6);
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 });
    }

    const db = await getDb();
    const userLastAnalyzedId = await getUserLastAnalyzedCommentId(userId);
    const snapshot = queryOne<UserProfileSnapshot>(
      db,
      `SELECT * FROM user_profile_snapshots WHERE user_id = ?`,
      [userId]
    );

    const isStale = !snapshot || snapshot.based_on_last_analyzed_comment_id !== userLastAnalyzedId;

    if (snapshot) {
      const labels = JSON.parse(snapshot.labels_json);
      return NextResponse.json({
        snapshot: {
          user_id: snapshot.user_id,
          computed_at: snapshot.computed_at,
          based_on_last_analyzed_comment_id: snapshot.based_on_last_analyzed_comment_id,
          labels,
          model_version: snapshot.model_version,
        },
        is_stale: isStale,
      });
    }
    return NextResponse.json({ snapshot: null, is_stale: true });
  } catch (error) {
    console.error('User profile analysis API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId query parameter is required' }, { status: 400 });
    }

    const db = await getDb();
    const userLastAnalyzedId = await getUserLastAnalyzedCommentId(userId);
    const analyses = queryAll<CommentAnalysis>(
      db,
      `SELECT * FROM comment_analyses WHERE author_id = ? ORDER BY created_at DESC LIMIT 500`,
      [userId]
    );

    const labels = computeLabels(analyses);
    const now = new Date().toISOString();

    const existing = queryOne<{ user_id: string }>(
      db,
      `SELECT user_id FROM user_profile_snapshots WHERE user_id = ?`,
      [userId]
    );

    if (existing) {
      db.run(
        `UPDATE user_profile_snapshots SET computed_at = ?, based_on_last_analyzed_comment_id = ?, labels_json = ?, model_version = ? WHERE user_id = ?`,
        [now, userLastAnalyzedId || null, JSON.stringify(labels), MODEL_VERSION, userId]
      );
    } else {
      db.run(
        `INSERT INTO user_profile_snapshots (user_id, computed_at, based_on_last_analyzed_comment_id, labels_json, model_version) VALUES (?, ?, ?, ?, ?)`,
        [userId, now, userLastAnalyzedId || null, JSON.stringify(labels), MODEL_VERSION]
      );
    }

    saveDb();

    return NextResponse.json({
      snapshot: {
        user_id: userId,
        computed_at: now,
        based_on_last_analyzed_comment_id: userLastAnalyzedId,
        labels,
        model_version: MODEL_VERSION,
      },
      is_stale: false,
    });
  } catch (error) {
    console.error('User profile analysis API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
