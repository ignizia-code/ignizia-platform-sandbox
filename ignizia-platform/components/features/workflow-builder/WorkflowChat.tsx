'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AudioBars } from '@/components/ui/AudioBars';
import { WorkflowNode, WorkflowEdge } from '@/types';

export interface FileAttachment {
  id: string;
  name: string;
  content: string;
  type: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: FileAttachment[];
  suggestions?: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    replaceWorkflow?: boolean;
  };
  timestamp: string;
}

interface WorkflowChatProps {
  messages: Message[];
  onSendMessage: (text: string, files?: FileAttachment[]) => void;
  onAddSuggestions: (nodes: WorkflowNode[], edges: WorkflowEdge[], replaceWorkflow?: boolean) => void;
  isLoading: boolean;
  voiceOutputEnabled: boolean;
  onToggleVoiceOutput: () => void;
  autoAudioPlayersRef: React.MutableRefObject<{ [key: string]: HTMLAudioElement }>;
  autoPlayedMessageIdsRef: React.MutableRefObject<Set<string>>;
  messageCountWhenEnabledRef: React.MutableRefObject<number>;
  policyBlockedMessage?: string | null;
}

const WorkflowChat: React.FC<WorkflowChatProps> = ({
  messages,
  onSendMessage,
  onAddSuggestions,
  isLoading,
  voiceOutputEnabled,
  onToggleVoiceOutput,
  autoAudioPlayersRef,
  autoPlayedMessageIdsRef,
  messageCountWhenEnabledRef,
  policyBlockedMessage,
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingSuggestions, setPendingSuggestions] = useState<{
    messageId: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const shouldTranscribeRef = useRef(false);
  
  // Manual playback refs (separate from auto-playback to avoid conflicts)
  const manualAudioPlayersRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  
  // Track loading states for manual playback per message
  const [manualLoadingState, setManualLoadingState] = useState<{ [key: string]: boolean }>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-play voice for NEW assistant messages when toggle is enabled
  useEffect(() => {
    if (!voiceOutputEnabled || isLoading || messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    
    // Only auto-play if:
    // 1. It's an assistant message
    // 2. It hasn't been auto-played before
    // 3. It arrived AFTER the toggle was enabled (message index > count when enabled)
    if (
      lastMessage?.role === 'assistant' &&
      !autoPlayedMessageIdsRef.current.has(lastMessage.id) &&
      messages.length > messageCountWhenEnabledRef.current
    ) {
      autoPlayedMessageIdsRef.current.add(lastMessage.id);
      generateAutoSpeech(lastMessage.id, lastMessage.content);
    }
  }, [messages, voiceOutputEnabled, isLoading]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading) return;
    onSendMessage(inputValue, attachedFiles);
    setInputValue('');
    setAttachedFiles([]);
  };

  const handleAddSuggestions = (
    messageId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    replaceWorkflow?: boolean
  ) => {
    onAddSuggestions(nodes, edges, replaceWorkflow);
    setPendingSuggestions(null);
  };

  const handleIgnoreSuggestions = () => {
    setPendingSuggestions(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const base64Content = content.split(',')[1] || content;
        
        setAttachedFiles(prev => [...prev, {
          id: `file-${Date.now()}-${i}`,
          name: file.name,
          content: base64Content,
          type: file.type,
        }]);
      };
      
      reader.readAsDataURL(file);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attached file
  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Send audio for transcription
  const sendAudioForTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const base64Audio = await blobToBase64(audioBlob);
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio: base64Audio }),
      });

      if (!response.ok) {
        throw new Error(`Transcription request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const transcript: string = data.text || '';
      if (transcript) {
        setInputValue(prev =>
          prev ? `${prev.trimEnd()} ${transcript}` : transcript
        );
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Start voice recording
  const startRecording = async () => {
    if (isRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('Audio recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      shouldTranscribeRef.current = false;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
        setIsRecording(false);
        if (shouldTranscribeRef.current) {
          sendAudioForTranscription(audioBlob);
        } else {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting audio recording:', error);
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    shouldTranscribeRef.current = false;
    setIsTranscribing(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      setIsRecording(false);
    }
  };

  // Confirm recording (send for transcription)
  const confirmRecording = () => {
    if (!isRecording || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }
    shouldTranscribeRef.current = true;
    setIsTranscribing(true);
    mediaRecorderRef.current.stop();
  };

  // Generate speech for manual playback (speaker button)
  const generateManualSpeech = async (messageId: string, text: string) => {
    // Set loading state for this message
    setManualLoadingState(prev => ({ ...prev, [messageId]: true }));
    
    try {
      // Stop any existing audio for this message
      if (manualAudioPlayersRef.current[messageId]) {
        manualAudioPlayersRef.current[messageId].pause();
        delete manualAudioPlayersRef.current[messageId];
      }

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice: 'alloy' }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      manualAudioPlayersRef.current[messageId] = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        delete manualAudioPlayersRef.current[messageId];
        setManualLoadingState(prev => ({ ...prev, [messageId]: false }));
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        delete manualAudioPlayersRef.current[messageId];
        setManualLoadingState(prev => ({ ...prev, [messageId]: false }));
      };

      await audio.play();
    } catch (error) {
      console.error('Error generating speech:', error);
      setManualLoadingState(prev => ({ ...prev, [messageId]: false }));
    }
  };

  // Generate speech for auto-play (toggle feature)
  const generateAutoSpeech = async (messageId: string, text: string) => {
    try {
      // Stop any existing auto-play audio for this message
      if (autoAudioPlayersRef.current[messageId]) {
        autoAudioPlayersRef.current[messageId].pause();
        delete autoAudioPlayersRef.current[messageId];
      }

      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice: 'alloy' }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      autoAudioPlayersRef.current[messageId] = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        delete autoAudioPlayersRef.current[messageId];
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        delete autoAudioPlayersRef.current[messageId];
      };

      await audio.play();
    } catch (error) {
      console.error('Error generating auto speech:', error);
    }
  };

  // Toggle audio playback for a message (manual button)
  const toggleAudioPlayback = (messageId: string, text: string) => {
    const audio = manualAudioPlayersRef.current[messageId];
    const isLoading = manualLoadingState[messageId];

    if (isLoading) {
      // If loading, stop/cancel it
      if (audio) {
        audio.pause();
        URL.revokeObjectURL(audio.src);
        delete manualAudioPlayersRef.current[messageId];
      }
      setManualLoadingState(prev => ({ ...prev, [messageId]: false }));
    } else if (audio && !audio.paused) {
      // If playing, pause it
      audio.pause();
    } else if (audio && audio.paused) {
      // If paused, resume
      audio.play();
    } else {
      // If no audio exists, generate and play
      generateManualSpeech(messageId, text);
    }
  };

  // Stop audio playback (manual)
  const stopAudioPlayback = (messageId: string) => {
    const audio = manualAudioPlayersRef.current[messageId];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      delete manualAudioPlayersRef.current[messageId];
    }
    setManualLoadingState(prev => ({ ...prev, [messageId]: false }));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      // Cleanup all audio players
      Object.values(manualAudioPlayersRef.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      Object.values(autoAudioPlayersRef.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800">
      {/* Header with voice controls */}
      <div className="border-b border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="material-icons-round text-slate-500 dark:text-slate-400 text-sm">smart_toy</span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">AI Assistant</span>
        </div>
        <button
          onClick={onToggleVoiceOutput}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            voiceOutputEnabled
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
          }`}
          title={voiceOutputEnabled ? 'Auto-play AI responses enabled' : 'Auto-play AI responses disabled'}
        >
          <span className="material-icons-round text-sm">
            {voiceOutputEnabled ? 'volume_up' : 'volume_off'}
          </span>
          {voiceOutputEnabled ? 'Auto-Voice On' : 'Auto-Voice Off'}
        </button>
      </div>

      {policyBlockedMessage && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 flex items-start gap-2">
          <span className="material-icons-round text-red-600 dark:text-red-400 text-lg flex-shrink-0">block</span>
          <p className="text-sm text-red-800 dark:text-red-200">
            {policyBlockedMessage}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 dark:text-slate-500 py-8">
            <p className="text-sm">Start by describing your workflow...</p>
            <p className="text-xs mt-2">Or click the microphone to speak</p>
          </div>
        ) : (
          messages.map((message) => {
            const isManualLoading = manualLoadingState[message.id];
            const isManualPlaying = manualAudioPlayersRef.current[message.id] && 
                                   !manualAudioPlayersRef.current[message.id].paused;
            
            return (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap select-text">{message.content}</p>

                  {/* Attached files display */}
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <div className="space-y-1">
                        {message.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded"
                          >
                            <span className="material-icons-round text-xs">
                              {file.type.includes('pdf') ? 'picture_as_pdf' : 'description'}
                            </span>
                            <span className="truncate">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {message.suggestions &&
                    pendingSuggestions?.messageId !== message.id && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                          {message.suggestions.replaceWorkflow 
                            ? `Suggested workflow (${message.suggestions.nodes.length} nodes):`
                            : 'Suggested additions:'}
                        </p>
                        <ul className="space-y-1 mb-3">
                          {message.suggestions.nodes.map((node) => (
                            <li
                              key={node.id}
                              className="text-sm flex items-center gap-2"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              {node.name}
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleAddSuggestions(
                                message.id,
                                message.suggestions!.nodes,
                                message.suggestions!.edges,
                                message.suggestions!.replaceWorkflow
                              )
                            }
                            className={`px-3 py-1.5 text-white text-sm rounded-md transition-colors ${
                              message.suggestions?.replaceWorkflow 
                                ? 'bg-orange-500 hover:bg-orange-600' 
                                : 'bg-emerald-500 hover:bg-emerald-600'
                            }`}
                          >
                            {message.suggestions?.replaceWorkflow ? 'Replace Workflow' : 'Add to Canvas'}
                          </button>
                          <button
                            onClick={handleIgnoreSuggestions}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 text-sm rounded-md transition-colors"
                          >
                            {message.suggestions?.replaceWorkflow ? 'Cancel' : 'Ignore'}
                          </button>
                        </div>
                      </div>
                    )}
                </div>
                
                {/* Audio playback button for assistant messages */}
                {message.role === 'assistant' && (
                  <div className="relative flex-shrink-0 group ml-2 self-end">
                    <button
                      onClick={() => toggleAudioPlayback(message.id, message.content)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        isManualPlaying
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                      }`}
                      aria-label={isManualLoading ? 'Loading audio' : isManualPlaying ? 'Pause audio' : 'Play message audio'}
                      title={isManualLoading ? 'Loading audio...' : isManualPlaying ? 'Pause audio' : 'Play message as audio'}
                    >
                      {isManualLoading ? (
                        <span className="material-icons-round text-base animate-spin">
                          autorenew
                        </span>
                      ) : isManualPlaying ? (
                        <span className="material-icons-round text-base">
                          pause
                        </span>
                      ) : (
                        <span className="material-icons-round text-base">
                          volume_up
                        </span>
                      )}
                    </button>
                    {(isManualLoading || isManualPlaying) && (
                      <button
                        onClick={() => stopAudioPlayback(message.id)}
                        className="absolute inset-0 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        aria-label="Stop audio"
                        title="Stop audio"
                      >
                        <span className="material-icons-round text-base">
                          close
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg px-4 py-3">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - matching ChatBot.tsx exactly */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-800">
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {attachedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded px-2 py-1 text-xs"
              >
                <span className="material-icons-round text-xs text-blue-600 dark:text-blue-400">
                  {file.type.includes('pdf') ? 'picture_as_pdf' : 'description'}
                </span>
                <span className="text-blue-900 dark:text-blue-200 truncate max-w-xs">{file.name}</span>
                <button
                  onClick={() => removeAttachedFile(file.id)}
                  className="ml-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  aria-label="Remove file"
                >
                  <span className="material-icons-round text-xs">close</span>
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex gap-2 items-center">
          {isRecording || isTranscribing ? (
            <div className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center">
              <AudioBars stream={audioStreamRef.current} isTranscribing={isTranscribing} />
            </div>
          ) : (
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your workflow..."
              className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              rows={1}
              disabled={isLoading}
            />
          )}

          {isRecording || isTranscribing ? (
            isTranscribing ? (
              <button
                disabled
                className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm"
                aria-label="Transcribing voice input"
              >
                <span className="material-icons-round text-sm animate-spin">
                  autorenew
                </span>
              </button>
            ) : (
              <>
                <button
                  onClick={cancelRecording}
                  disabled={isLoading}
                  className="w-8 h-8 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Cancel voice input"
                >
                  <span className="material-icons-round text-xs">close</span>
                </button>
                <button
                  onClick={confirmRecording}
                  disabled={isLoading}
                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all"
                  aria-label="Send voice input"
                >
                  <span className="material-icons-round text-xs">check</span>
                </button>
              </>
            )
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-8 h-8 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Attach file"
                title="Attach file (PDF, TXT, etc.)"
              >
                <span className="material-icons-round text-xs">attach_file</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.txt,.doc,.docx,.csv,.json"
                aria-label="File input"
              />
              {inputValue.trim() || attachedFiles.length > 0 ? (
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg transition-all font-medium text-xs flex items-center justify-center shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                >
                  <span className="material-icons-round text-sm">send</span>
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={isLoading}
                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-full transition-all flex items-center justify-center shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                  aria-label="Start voice input"
                >
                  <span className="material-icons-round text-sm">mic</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowChat;
