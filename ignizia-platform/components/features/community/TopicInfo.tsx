'use client';

import React, { useState, useEffect } from 'react';
import { Topic, TopicAnalysisSnapshot, TopicMetrics, TopicAISummary } from '@/types';

interface TopicInfoProps {
  topic: Topic;
  onClose: () => void;
}

const TopicInfo: React.FC<TopicInfoProps> = ({ topic, onClose }) => {
  const [snapshot, setSnapshot] = useState<{
    topic_id: string;
    computed_at: string;
    based_on_last_comment_id?: string;
    metrics: TopicMetrics;
    ai_summary: TopicAISummary;
    model_version: string;
  } | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalysis = async () => {
    try {
      const res = await fetch(`/api/topic-analysis?topicId=${topic.id}`);
      const data = await res.json();
      setSnapshot(data.snapshot);
      setIsStale(data.is_stale);

      // Auto-refresh if stale
      if (data.is_stale) {
        refreshAnalysis();
      }
    } catch (error) {
      console.error('Failed to fetch topic analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAnalysis = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/topic-analysis?topicId=${topic.id}`, {
        method: 'POST',
      });
      const data = await res.json();
      setSnapshot(data.snapshot);
      setIsStale(data.is_stale);
    } catch (error) {
      console.error('Failed to refresh topic analysis:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [topic.id]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-emerald-500';
      case 'negative':
        return 'text-red-500';
      case 'mixed':
        return 'text-amber-500';
      default:
        return 'text-slate-500';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high':
        return 'text-emerald-500';
      case 'low':
        return 'text-red-500';
      default:
        return 'text-amber-500';
    }
  };

  const getFocusColor = (score: number) => {
    if (score >= 0.7) return 'bg-emerald-500';
    if (score >= 0.4) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Topic Analytics</h3>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span className="material-icons-round text-xl">close</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : !snapshot ? (
          <div className="text-center text-slate-400 py-8">
            <span className="material-icons-round text-3xl mb-2 block">analytics</span>
            <p className="text-sm">No analysis available yet</p>
            <p className="text-xs mt-1">Analysis will be generated after comments are posted</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Updating indicator */}
            {refreshing && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Updating analysis...</span>
              </div>
            )}

            {/* Metrics */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {snapshot.metrics.comment_count}
                  </div>
                  <div className="text-xs text-slate-400">Total Comments</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {snapshot.metrics.unique_participants}
                  </div>
                  <div className="text-xs text-slate-400">Participants</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {snapshot.metrics.comments_last_hour}
                  </div>
                  <div className="text-xs text-slate-400">Last Hour</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {snapshot.metrics.comments_last_24h}
                  </div>
                  <div className="text-xs text-slate-400">Last 24h</div>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                AI Summary
              </h4>
              <div className="space-y-4">
                {/* Sentiment */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Sentiment</span>
                  <span
                    className={`text-sm font-medium capitalize ${getSentimentColor(
                      snapshot.ai_summary.sentiment
                    )}`}
                  >
                    {snapshot.ai_summary.sentiment}
                  </span>
                </div>

                {/* Quality */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Quality</span>
                  <span
                    className={`text-sm font-medium capitalize ${getQualityColor(
                      snapshot.ai_summary.quality
                    )}`}
                  >
                    {snapshot.ai_summary.quality}
                  </span>
                </div>

                {/* Focus Score */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Focus Score</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {Math.round(snapshot.ai_summary.focus_score * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getFocusColor(snapshot.ai_summary.focus_score)} transition-all`}
                      style={{ width: `${snapshot.ai_summary.focus_score * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-400">
                Last updated: {formatDate(snapshot.computed_at)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicInfo;
