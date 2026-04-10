import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, queryAll, queryOne } from '@/lib/db';

interface Topic {
  id: string;
  creator_id: string;
  starter_text: string;
  starter_media_url?: string;
  created_at: string;
  last_comment_id?: string;
  last_comment_at?: string;
}

interface TopicWithCount extends Topic {
  comment_count: number;
}

export async function GET() {
  try {
    const db = await getDb();
      // List all topics with comment counts
    const topics = queryAll<TopicWithCount>(db, `
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM comments c WHERE c.topic_id = t.id) as comment_count
      FROM topics t
      ORDER BY t.created_at DESC
    `);
    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Topics API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { creator_id, starter_text, starter_media_url } = await request.json();

    if (!creator_id || !starter_text) {
      return NextResponse.json({ error: 'creator_id and starter_text are required' }, { status: 400 });
    }

    const db = await getDb();
    const id = `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const created_at = new Date().toISOString();

    db.run(
      `INSERT INTO topics (id, creator_id, starter_text, starter_media_url, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, creator_id, starter_text, starter_media_url || null, created_at]
    );
    saveDb();

    const topic = queryOne<Topic>(db, `SELECT * FROM topics WHERE id = ?`, [id]);
    return NextResponse.json({ topic }, { status: 201 });
  } catch (error) {
    console.error('Topics API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
