'use client';

import React, { useState, useEffect } from 'react';
import { Topic } from '@/types';

interface TopicWithCount extends Topic {
  comment_count: number;
}

interface TopicListProps {
  onSelectTopic: (topic: TopicWithCount) => void;
  selectedTopicId?: string;
  userId: string;
  onTopicDeleted?: (topicId: string) => void;
}

const TopicList: React.FC<TopicListProps> = ({
  onSelectTopic,
  selectedTopicId,
  userId,
  onTopicDeleted,
}) => {
  const [topics, setTopics] = useState<TopicWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicText, setNewTopicText] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchTopics = async () => {
    try {
      const res = await fetch('/api/topics');
      const data = await res.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = async () => {
    if (!newTopicText.trim() || creating) return;

    setCreating(true);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: userId,
          starter_text: newTopicText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTopics([{ ...data.topic, comment_count: 0 }, ...topics]);
        setNewTopicText('');
        setShowNewTopic(false);
        onSelectTopic({ ...data.topic, comment_count: 0 });
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteTopic = async (topicId: string) => {
    const confirmDelete = window.confirm(
      'Delete this topic and all of its comments and analyses? This cannot be undone.'
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/topic?topicId=${encodeURIComponent(topicId)}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        console.error('Failed to delete topic:', await res.text());
        return;
      }

      setTopics((prev) => prev.filter((t) => t.id !== topicId));
      if (onTopicDeleted) {
        onTopicDeleted(topicId);
      }
    } catch (error) {
      console.error('Failed to delete topic:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Topics</h2>
          <button
            onClick={() => setShowNewTopic(!showNewTopic)}
            className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <span className="material-icons-round text-lg">add</span>
          </button>
        </div>

        {showNewTopic && (
          <div className="space-y-3">
            <textarea
              value={newTopicText}
              onChange={(e) => setNewTopicText(e.target.value)}
              placeholder="Start a new topic..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateTopic}
                disabled={!newTopicText.trim() || creating}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create Topic'}
              </button>
              <button
                onClick={() => {
                  setShowNewTopic(false);
                  setNewTopicText('');
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {topics.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <span className="material-icons-round text-4xl mb-2 block">forum</span>
            <p>No topics yet</p>
            <p className="text-sm">Start a new discussion!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => onSelectTopic(topic)}
                className={`w-full cursor-pointer px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start justify-between gap-3 ${
                  selectedTopicId === topic.id ? 'bg-slate-100 dark:bg-slate-800' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-white line-clamp-2 mb-1">
                    {topic.starter_text}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="material-icons-round text-sm">chat_bubble_outline</span>
                      {topic.comment_count || 0}
                    </span>
                    <span>{formatDate(topic.created_at)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTopic(topic.id);
                  }}
                  title="Delete topic"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex-shrink-0"
                >
                  <span className="material-icons-round text-base">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicList;
