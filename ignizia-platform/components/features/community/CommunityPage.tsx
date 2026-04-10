'use client';

import React, { useState, useEffect } from 'react';
import TopicList from './TopicList';
import TopicDetail from './TopicDetail';
import TopicInfo from './TopicInfo';
import UserProfile from './UserProfile';
import { Topic } from '@/types';

interface TopicWithCount extends Topic {
  comment_count: number;
}

interface CommunityPageProps {
  userRole: string;
}

const CommunityPage: React.FC<CommunityPageProps> = ({ userRole }) => {
  const [selectedTopic, setSelectedTopic] = useState<TopicWithCount | null>(null);
  const [showTopicInfo, setShowTopicInfo] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Generate a consistent user ID based on the role (or use session storage)
  const [userId] = useState(() => {
    if (typeof window === 'undefined') {
      return `${userRole.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
    }
    const key = 'community_user_id';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `${userRole.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  });

  const handleSelectTopic = (topic: TopicWithCount) => {
    setSelectedTopic(topic);
    setShowTopicInfo(false);
    setShowUserProfile(false);
    setSelectedUserId(null);
  };

  const handleOpenTopicInfo = () => {
    setShowTopicInfo(true);
    setShowUserProfile(false);
    setSelectedUserId(null);
  };

  const handleTopicDeleted = (topicId: string) => {
    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic(null);
      setShowTopicInfo(false);
      setShowUserProfile(false);
      setSelectedUserId(null);
    }
  };

  const handleOpenUserProfile = (targetUserId: string) => {
    setSelectedUserId(targetUserId);
    setShowUserProfile(true);
    setShowTopicInfo(false);
  };

  const handleCloseSidePanel = () => {
    setShowTopicInfo(false);
    setShowUserProfile(false);
    setSelectedUserId(null);
  };

  return (
    <div className="flex h-full bg-background-light dark:bg-background-dark">
      {/* Topic List - Left Panel */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <TopicList
          onSelectTopic={handleSelectTopic}
          selectedTopicId={selectedTopic?.id}
          userId={userId}
          onTopicDeleted={handleTopicDeleted}
        />
      </div>

      {/* Main Content - Topic Detail */}
      <div className="flex-1 flex min-w-0">
        {selectedTopic ? (
          <div className="flex-1 min-w-0">
            <TopicDetail
              topic={selectedTopic}
              userId={userId}
              onOpenTopicInfo={handleOpenTopicInfo}
              onOpenUserProfile={handleOpenUserProfile}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <span className="material-icons-round text-5xl mb-3 block">forum</span>
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-1">
                Welcome to Community
              </h3>
              <p className="text-sm">Select a topic or start a new discussion</p>
            </div>
          </div>
        )}

        {/* Side Panel - Topic Info or User Profile */}
        {(showTopicInfo || showUserProfile) && (
          <div className="w-80 flex-shrink-0 border-l border-slate-200 dark:border-slate-800">
            {showTopicInfo && selectedTopic && (
              <TopicInfo topic={selectedTopic} onClose={handleCloseSidePanel} />
            )}
            {showUserProfile && selectedUserId && (
              <UserProfile userId={selectedUserId} onClose={handleCloseSidePanel} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;
