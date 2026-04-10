'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { OnlineUser, CollabMessage } from '@/lib/workflowCollaboration/useWorkflowCollaboration';

interface WorkflowCollaborationPanelProps {
  onlineUsers: OnlineUser[];
  messages: CollabMessage[];
  sendMessage: (text: string) => void;
  voiceActive: boolean;
  voiceParticipants: string[];
  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
  currentUserId: string;
}

const WorkflowCollaborationPanel: React.FC<WorkflowCollaborationPanelProps> = ({
  onlineUsers,
  messages,
  sendMessage,
  voiceActive,
  voiceParticipants,
  joinVoice,
  leaveVoice,
  currentUserId,
}) => {
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const t = chatInput.trim();
    if (!t) return;
    sendMessage(t);
    setChatInput('');
  };

  const getDisplayName = (userId: string): string => {
    return onlineUsers.find((u) => u.userId === userId)?.displayName ?? 'Someone';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      {/* Presence */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
          <span className="material-icons-round text-base text-success">person</span>
          Online ({onlineUsers.length})
        </h2>
        <ul className="space-y-1">
          {onlineUsers.map((u) => (
            <li
              key={u.userId}
              className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <span className="w-2 h-2 rounded-full bg-success shrink-0" />
              {u.displayName}
              {u.userId === currentUserId && (
                <span className="text-xs text-slate-500 dark:text-slate-400">(you)</span>
              )}
            </li>
          ))}
          {onlineUsers.length === 0 && (
            <li className="text-xs text-slate-500 dark:text-slate-400">No one else here yet</li>
          )}
        </ul>
      </div>

      {/* Group chat */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 p-2 flex items-center gap-2">
          <span className="material-icons-round text-base text-action">chat</span>
          Chat
        </h2>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
          {messages.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No messages yet. Say hi!</p>
          ) : (
            messages.map((m, i) => (
              <div
                key={`${m.createdAt}-${i}`}
                className={`text-xs ${m.userId === currentUserId ? 'text-right' : ''}`}
              >
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  {m.userId === currentUserId ? 'You' : m.displayName}:
                </span>{' '}
                <span className="text-slate-800 dark:text-slate-200">{m.text}</span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-2 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!chatInput.trim()}
            className="px-3 py-1.5 rounded bg-action text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>

      {/* Voice */}
      <div className="p-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
          <span className="material-icons-round text-base text-primary">mic</span>
          Voice
        </h2>
        {voiceActive ? (
          <>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">You are in the voice channel.</p>
            {voiceParticipants.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                In voice: {voiceParticipants.map((id) => getDisplayName(id)).join(', ')}
              </p>
            )}
            <button
              type="button"
              onClick={leaveVoice}
              className="px-3 py-1.5 rounded bg-danger text-white text-sm font-medium hover:opacity-90"
            >
              Leave Voice
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Join to talk with others in this workflow.</p>
            <button
              type="button"
              onClick={joinVoice}
              className="px-3 py-1.5 rounded bg-action text-white text-sm font-medium hover:opacity-90"
            >
              Join Voice
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkflowCollaborationPanel;
