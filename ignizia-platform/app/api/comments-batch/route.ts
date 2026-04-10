import { NextRequest, NextResponse } from 'next/server';
import { getDb, queryAll, queryOne } from '@/lib/db';

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
  relevance: string;
  tone: string;
  constructiveness: string;
  short_reason?: string;
  model_version: string;
  created_at: string;
}

interface CommentWithAnalysis extends Comment {
  analysis?: CommentAnalysis;
}

export async function GET(request: NextRequest) {
  try {
    const ids = request.nextUrl.searchParams.get('ids');

    if (!ids) {
      return NextResponse.json({ error: 'ids query parameter is required' }, { status: 400 });
    }

    const idList = ids.split(',').filter(Boolean);

    if (idList.length === 0) {
      return NextResponse.json({ comments: [] });
    }

    if (idList.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 IDs allowed per request' }, { status: 400 });
    }

    const db = await getDb();

    const comments: CommentWithAnalysis[] = [];

    for (const id of idList) {
      const comment = queryOne<Comment>(db, `SELECT * FROM comments WHERE id = ?`, [id]);
      if (comment) {
        const analysis = queryOne<CommentAnalysis>(
          db,
          `SELECT * FROM comment_analyses WHERE comment_id = ?`,
          [id]
        );
        comments.push({ ...comment, analysis: analysis || undefined });
      }
    }

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Comments batch API error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
