'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Topic, CommentWithAnalysis } from '@/types';

interface TopicWithCount extends Topic {
  comment_count: number;
}

interface TopicDetailProps {
  topic: TopicWithCount;
  userId: string;
  onOpenTopicInfo: () => void;
  onOpenUserProfile: (userId: string) => void;
}

const TopicDetail: React.FC<TopicDetailProps> = ({
  topic,
  userId,
  onOpenTopicInfo,
  onOpenUserProfile,
}) => {
  const [comments, setComments] = useState<CommentWithAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?topicId=${topic.id}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchComments();
  }, [topic.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const handlePostComment = async () => {
    if (!newComment.trim() || posting) return;

    setPosting(true);
    try {
      const res = await fetch(`/api/comments?topicId=${topic.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: userId,
          text: newComment.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments([...comments, data.comment]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setPosting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getAnalysisBadge = (analysis: CommentWithAnalysis['analysis']) => {
    if (!analysis) return null;

    // Normalize to strings for safety and detect malformed AI outputs
    const relevance = typeof analysis.relevance === 'string' ? analysis.relevance : 'unknown';
    const tone = typeof analysis.tone === 'string' ? analysis.tone : 'unknown';
    const constructive = typeof analysis.constructiveness === 'string' ? analysis.constructiveness : 'unknown';

    // Always show all three labels (relevance, tone, constructiveness)
    const relevanceLabel =
      relevance === 'on_topic'
        ? 'On-topic'
        : relevance === 'loosely_related'
        ? 'Loosely related'
        : relevance === 'off_topic'
        ? 'Off-topic'
        : 'Relevance: Unknown';

    const toneLabel =
      tone === 'positive' ||
      tone === 'neutral' ||
      tone === 'negative' ||
      tone === 'aggressive'
        ? tone.charAt(0).toUpperCase() + tone.slice(1)
        : 'Tone: Unknown';

    const constructivenessLabel =
      constructive === 'constructive'
        ? 'Constructive'
        : constructive === 'low_value'
        ? 'Low-value'
        : constructive === 'disruptive'
        ? 'Disruptive'
        : 'Constructiveness: Unknown';

    const relevanceClass =
      relevance === 'on_topic'
        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
        : relevance === 'loosely_related'
        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
        : relevance === 'off_topic'
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';

    const toneClass =
      tone === 'positive'
        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
        : tone === 'neutral'
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
        : tone === 'negative'
        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
        : tone === 'aggressive'
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';

    const constructiveClass =
      constructive === 'constructive'
        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
        : constructive === 'low_value'
        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
        : constructive === 'disruptive'
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        <span
          className={`px-1.5 py-0.5 text-[10px] rounded ${relevanceClass}`}
        >
          {relevanceLabel}
        </span>
        <span
          className={`px-1.5 py-0.5 text-[10px] rounded ${toneClass}`}
        >
          {toneLabel}
        </span>
        <span
          className={`px-1.5 py-0.5 text-[10px] rounded ${constructiveClass}`}
        >
          {constructivenessLabel}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Topic Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-900 dark:text-white">{topic.starter_text}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
              <button
                onClick={() => onOpenUserProfile(topic.creator_id)}
                className="hover:text-primary transition-colors"
              >
                {topic.creator_id}
              </button>
              <span>•</span>
              <span>{formatDate(topic.created_at)}</span>
            </div>
          </div>
          <button
            onClick={onOpenTopicInfo}
            className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Topic Info & Analytics"
          >
            <span className="material-icons-round text-xl">insights</span>
          </button>
        </div>
      </div>

      {/* Comments Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <span className="material-icons-round text-3xl mb-2 block">chat</span>
            <p className="text-sm">No comments yet. Start the conversation!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`flex gap-3 ${comment.author_id === userId ? 'flex-row-reverse' : ''}`}
            >
              <button
                onClick={() => onOpenUserProfile(comment.author_id)}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300 hover:ring-2 hover:ring-primary/50 transition-all"
              >
                {comment.author_id.slice(0, 2).toUpperCase()}
              </button>
              <div
                className={`flex-1 max-w-[80%] ${
                  comment.author_id === userId ? 'text-right' : ''
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-2xl text-sm ${
                    comment.author_id === userId
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-sm'
                  }`}
                >
                  <p>{comment.text}</p>
                </div>
                <div
                  className={`flex items-center gap-2 mt-1 text-[10px] text-slate-400 ${
                    comment.author_id === userId ? 'justify-end' : ''
                  }`}
                >
                  <span>{formatTime(comment.created_at)}</span>
                  {getAnalysisBadge(comment.analysis)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
            placeholder="Write a comment..."
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handlePostComment}
            disabled={!newComment.trim() || posting}
            className="p-2.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-icons-round text-lg">
              {posting ? 'hourglass_empty' : 'send'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopicDetail;
