import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryOne, saveDb } from '@/lib/db';

interface Topic {
  id: string;
  creator_id: string;
  starter_text: string;
  starter_media_url?: string;
  created_at: string;
  last_comment_id?: string;
  last_comment_at?: string;
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

    return NextResponse.json({ topic });
    } catch (error) {
      console.error('Topic API error:', error);
      return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
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

    db.run(`DELETE FROM comment_analyses WHERE topic_id = ?`, [topicId]);
      db.run(`DELETE FROM comments WHERE topic_id = ?`, [topicId]);
    db.run(`DELETE FROM topic_analysis_snapshots WHERE topic_id = ?`, [topicId]);
    db.run(`DELETE FROM topics WHERE id = ?`, [topicId]);

    saveDb();
    return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error('Topic API error:', error);
      return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
    }
}
