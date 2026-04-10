'use client';

import React, { useState, useEffect } from 'react';
import { UserLabel, CommentWithAnalysis } from '@/types';

interface UserProfileProps {
  userId: string;
  onClose: () => void;
}

interface ProfileSnapshot {
  user_id: string;
  computed_at: string;
  based_on_last_analyzed_comment_id?: string;
  labels: UserLabel[];
  model_version: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onClose }) => {
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<UserLabel | null>(null);
  const [evidenceComments, setEvidenceComments] = useState<CommentWithAnalysis[]>([]);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/user-profile-analysis?userId=${userId}`);
      const data = await res.json();
      setSnapshot(data.snapshot);
      setIsStale(data.is_stale);

      // Auto-refresh if stale
      if (data.is_stale) {
        refreshProfile();
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/user-profile-analysis?userId=${userId}`, {
        method: 'POST',
      });
      const data = await res.json();
      setSnapshot(data.snapshot);
      setIsStale(data.is_stale);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchEvidence = async (label: UserLabel) => {
    setLoadingEvidence(true);
    try {
      const ids = label.evidence_comment_ids.slice(0, 10).join(',');
      const res = await fetch(`/api/comments-batch?ids=${ids}`);
      const data = await res.json();
      setEvidenceComments(data.comments || []);
    } catch (error) {
      console.error('Failed to fetch evidence comments:', error);
    } finally {
      setLoadingEvidence(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (selectedLabel) {
      fetchEvidence(selectedLabel);
    } else {
      setEvidenceComments([]);
    }
  }, [selectedLabel]);

  const getLabelIcon = (key: string) => {
    switch (key) {
      case 'constructive_contributor':
        return 'thumb_up';
      case 'often_off_topic':
        return 'explore_off';
      case 'frequently_negative':
        return 'sentiment_dissatisfied';
      case 'low_value_commenter':
        return 'trending_down';
      case 'disruptive':
        return 'warning';
      case 'balanced_participant':
        return 'balance';
      default:
        return 'label';
    }
  };

  const getLabelColor = (key: string) => {
    switch (key) {
      case 'constructive_contributor':
      case 'balanced_participant':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'often_off_topic':
      case 'low_value_commenter':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'frequently_negative':
      case 'disruptive':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const formatLabelName = (key: string) => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getAnalysisSummary = (analysis: CommentWithAnalysis['analysis']) => {
    if (!analysis) return '';
    const parts = [analysis.relevance, analysis.tone, analysis.constructiveness];
    return parts.join(' • ');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedLabel ? (
            <button
              onClick={() => setSelectedLabel(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <span className="material-icons-round text-xl">arrow_back</span>
            </button>
          ) : null}
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {selectedLabel ? formatLabelName(selectedLabel.key) : 'User Profile'}
          </h3>
        </div>
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
        ) : selectedLabel ? (
          // Evidence View
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {selectedLabel.description}
            </p>
            <div className="text-xs text-slate-400">
              Score: {selectedLabel.score}% • {selectedLabel.evidence_comment_ids.length} evidence
              comments
            </div>

            {loadingEvidence ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {evidenceComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
                  >
                    <p className="text-sm text-slate-900 dark:text-white">{comment.text}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                      {comment.analysis && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{getAnalysisSummary(comment.analysis)}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !snapshot || snapshot.labels.length === 0 ? (
          // No Profile
          <div className="text-center text-slate-400 py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <span className="text-2xl font-bold text-slate-400">
                {userId.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{userId}</p>
            <p className="text-xs">No behavioral analysis available yet</p>
            <p className="text-xs mt-1">Analysis requires more community participation</p>
          </div>
        ) : (
          // Profile View
          <div className="space-y-6">
            {/* User Avatar */}
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {userId.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{userId}</p>
            </div>

            {/* Updating indicator */}
            {refreshing && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Updating profile...</span>
              </div>
            )}

            {/* Labels */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Behavioral Labels
              </h4>
              <div className="space-y-2">
                {snapshot.labels.map((label) => (
                  <button
                    key={label.key}
                    onClick={() => setSelectedLabel(label)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${getLabelColor(
                      label.key
                    )}`}
                  >
                    <span className="material-icons-round text-lg">{getLabelIcon(label.key)}</span>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{formatLabelName(label.key)}</div>
                      <div className="text-xs opacity-75">{label.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold">{label.score}%</div>
                      <span className="material-icons-round text-lg opacity-50">chevron_right</span>
                    </div>
                  </button>
                ))}
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

export default UserProfile;
