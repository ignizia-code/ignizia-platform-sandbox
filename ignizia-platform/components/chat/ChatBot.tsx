'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AudioBars } from '@/components/ui/AudioBars';
import { Button } from '@/components/ui';
import WidgetRenderer, { ChatWidget } from './WidgetRenderer';
import { Timeframe, DashboardView, MainSection } from '@/types';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  audioUrl?: string;
  isPlayingAudio?: boolean;
  widget?: ChatWidget; // optional generative UI widget from the assistant
}

interface ChatBotProps {
  timeframe?: Timeframe;
  view?: DashboardView;
  mainSection?: MainSection;
  portalApp?: string | null;
}

const getSectionSpecificContext = (
  mainSection?: MainSection,
  portalApp?: string | null,
  view?: DashboardView,
  timeframe?: Timeframe
): string => {
  switch (mainSection) {
    case 'Dashboard':
    default:
      return `
PAGE CONTEXT – DASHBOARD
- The user is looking at the main Collective Intelligence dashboard.
- This view shows team cohesion & psych safety, handoff & coordination, decision cadence, workforce readiness & trust, and learning impact & ROI.
- Prioritize interpreting the summary cards, trends, and alerts they can see on this view.
- When they say "this page" or "here", assume they mean the ${view ?? 'Dashboard'} view for timeframe ${timeframe ?? 'Week'}.
`;
    case 'LivingOps':
      return `
PAGE CONTEXT – LIVINGOPS
- The user is inside the LivingOps section where different authoring apps live (e.g. Talent Studio, Agent Studio, Workflow Builder, Strategy Studio).
- The currently selected LivingOps app is: ${portalApp ?? 'None selected'}.
- When they say "this page" or "this app", assume they mean the active LivingOps app shown inside the LivingOps shell.

PORTAL APP CONTEXT – DETAILS
- If portalApp === "talent-studio":
  • Talent Studio is a talent intelligence surface focused on roles, skills, teams, and coverage.
  • The page organizes departments, teams, roles, employees, and their skill levels, and can surface alerts like skill gaps or single points of failure.
  • When the user asks about "this page", briefly name the page and then focus on how you can help: identifying skill gaps, cover risks, and growth opportunities for the teams or roles they mention.
  • Keep explanations short and concrete. Avoid listing “prompts” – instead, describe in plain language the kinds of questions or tasks you can help with.

- If portalApp === "agent-studio":
  • Agent Studio is a visual canvas for designing AI agents as workflows made of nodes and connections.
  • Users work with Model Call nodes, Conditional nodes, and templates, plus an “AI Builder” side panel and a “Test Workflow” runner.
  • Prioritize questions about how to structure agents, what each node does, and how to route logic between steps.

- If portalApp === "workflow":
  • Workflow Builder is an operational workflow canvas with nodes, edges, and governance-aware metadata.
  • Nodes represent human or system steps (with cadence, recurrence, mode, duration, assigned roles, etc.); edges represent handoffs and channels.
  • There is also AI chat for workflow design, analytics panels, and a history of AI/manual revisions.
  • Prioritize questions about bottlenecks, handoffs, compliance checks, and how to rewire or optimize the workflow.

- If portalApp === "safe-ai-governance":
  • This loads the Policy Wizard for configuring AI governance for a team.
  • The wizard walks through data posture, external AI allowances, approved tools, review-required categories, and team scope, and saves a TeamPolicy with audit events.
  • Prioritize questions about policy settings, risk posture, approval flows, and how policies affect workflow and agent usage.

- If portalApp is another value (e.g. "strategy-studio", "workbench"):
  • Treat it as a future authoring surface for strategy, experimentation, or configuration.
  • Answer at a high level: what that kind of app would enable and how it could connect to metrics, workflows, and governance.
`;
    case 'Community':
      return `
PAGE CONTEXT – COMMUNITY
- The user is exploring Community signals: topics, comments, and discussion health.
- Focus on participation, sentiment, and topic-level metrics when answering questions.
`;
    case 'Analytics':
      return `
PAGE CONTEXT – ANALYTICS
- The user is in an analytics / reporting view.
- Emphasize cross-cutting trends, comparisons across timeframes, and KPI explanations.
`;
    case 'LearningHub':
      return `
PAGE CONTEXT – LEARNING HUB
- The user is focused on learning content, drills, and capability building.
- Tie answers back to learning impact, retention, and how content links to performance metrics.
`;
    case 'TeamPulse':
      return `
PAGE CONTEXT – TEAM PULSE
- The user is looking at near real-time team signals (mood, load, risks).
- Emphasize short-term signals, alerts, and suggested check-ins or interventions.
`;
    case 'Governance':
      return `
PAGE CONTEXT – GOVERNANCE
- The user is reviewing governance, policy, and AI safety/guardrail information.
- Focus on policy impact, risk, approvals, and decision-making quality.
`;
    case 'Omniverse':
      return `
PAGE CONTEXT – OMNIVERSE
- The user is in a 3D / digital twin view of their operation.
- When they ask about "here" or "this view", assume they mean the spatial layout and flows represented in the Omniverse scene.
`;
    case 'CareerFlow':
      return `
PAGE CONTEXT – CAREER FLOW
- The user is working with flows related to roles, skills, and growth paths.
- Emphasize how workflows and learning connect to specific roles and progression.
`;
    case 'FactoryCortexStudio':
      return `
PAGE CONTEXT – FACTORYCORTEX STUDIO
- The user is in FactoryCortex Studio (Digitizer, Live Twin, Orchestrator, Control Tower).
- Control Tower shows role-based lenses for operational metrics.
- Emphasize throughput, bottlenecks, decision lag, crew readiness, and experiment impact.
`;
    case 'IgniteIntelligenceStudio':
      return `
PAGE CONTEXT – IGNITE INTELLIGENCE STUDIO
- The user is in Ignite Intelligence Studio (ExoTwin, Academy, Exchange).
- Emphasize intelligence, learning, and exchange capabilities.
`;
    case 'IntelligenceGovernanceStudio':
      return `
PAGE CONTEXT – INTELLIGENCE GOVERNANCE STUDIO
- The user is in Intelligence Governance Studio (Registry, Standards, Controls, Assurance).
- Emphasize governance, compliance, and assurance.
`;
  }
};

const getDashboardContext = (
  timeframe: Timeframe = 'Week',
  view: DashboardView = 'Dashboard',
  mainSection?: MainSection,
  portalApp?: string | null
): string => {
  return `
You are an AI assistant for a Collective Intelligence Dashboard that tracks team performance and organizational metrics.

DASHBOARD CONTEXT & DATA:
===========================

CURRENT VIEW: ${view}
TIMEFRAME: ${timeframe}

CURRENT SECTION (MAIN NAV): ${mainSection ?? 'Dashboard'}
CURRENT LIVINGOPS APP (IF IN LIVINGOPS): ${
    mainSection === 'LivingOps' ? portalApp ?? 'None selected' : 'N/A'
  }

TEAM COHESION & PSYCHOLOGICAL SAFETY:
- Cohesion Index: 72 (↑5 vs last ${timeframe})
- Psychological Safety: 68 (↓3 - Action Required)
- Recognition Impact: +18% Growth
- Trust Sentiment: Stable

HANDOFF & COORDINATION:
- First-Time-Right Rate: 91% (Optimal)
- Rework Rate: 9%
- Coordination Latency: 2.1 hours
- Bottleneck: Station 7 - Packaging detected
- Weekly Handoff Trend: M(40) → T(50) → W(45) → T(55) → F(60)

DECISION CADENCE:
- Decision → Execution Lag: 18 hours (Critical Delay)
- Meeting → Action Ratio: 62%
- Briefing Routine Adoption: 78%
- Mentoring Interventions (${timeframe}): 24 total

WORKFORCE READINESS & TRUST:
- Crew Ready: 94% (+2% vs previous ${timeframe})
- Trust Index: 0.73 (steady)
- Override Rate: 12% (decreasing trend)
- Mode Mix: 64% Co-Pilot, 26% Manual, 10% Auto

LEARNING IMPACT & ROI:
- Effect Size (SOP x Drill): +14% Throughput
- Retention Curve: 82% avg this ${timeframe}
- Adoption Lift: +11% via coaching nudges
- Soft Skill Growth Index: ↑12% (Aggregated)

${getSectionSpecificContext(mainSection, portalApp, view, timeframe)}

GENERATIVE UI INSTRUCTIONS:
- If the user explicitly asks you to "create a widget" or similar, respond with
  a JSON object only, formatted as:

    {"text":"...","widget":{"title":"...","buttonLabel":"...","action":"alert","alertMessage":"..."}}

  where action is currently limited to "alert". Do NOT wrap the JSON in backticks or
  extra explanation.
- For all other queries, return plain text only (no JSON).

IMPORTANT CONSTRAINTS:
======================
1. ONLY answer questions related to the dashboard metrics, team performance, coordination, learning impact, organizational metrics, and collective intelligence concepts
2. If a question is outside this domain, respond with: "I'm specifically designed to help with questions about your collective intelligence dashboard and team metrics. Could you ask me something about your team's performance, coordination metrics, or learning impact?"
3. Be concise, actionable, and data-driven
4. Use the CURRENT SECTION and CURRENT PORTAL APP to ground your answers in the page the user is currently viewing. If they ask "this page" or "here", assume they mean that section.
5. Reference specific metrics when making recommendations when possible.
6. Keep responses under 200 words unless asked for detailed analysis.
7. Do NOT answer questions about topics unrelated to this dashboard (politics, general knowledge, personal advice, etc.)
  `;
};

const ChatBot: React.FC<ChatBotProps> = ({
  timeframe = 'Week',
  view = 'Dashboard',
  mainSection,
  portalApp,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text:
        "Hi, I’m Ignizia Copilot. I’m here to help you make sense of your team’s performance, coordination, learning impact, and organizational metrics.\n\n" +
        "You can ask me things like:\n" +
        "- “What’s blocking execution this week?”\n" +
        "- “Where is psychological safety dropping and why?”\n" +
        "- “Give me a quick performance snapshot for this view and timeframe.”",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const shouldTranscribeRef = useRef(false);
  const audioPlayersRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Cleanup audio resources on unmount
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      // Cleanup audio players
      Object.values(audioPlayersRef.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  const stopAudioVisualization = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const startAudioVisualization = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setAudioLevel(rms);
        animationFrameRef.current = requestAnimationFrame(tick);
      };

      audioContextRef.current = audioContext;
      tick();
    } catch (error) {
      console.error('Error starting audio visualization:', error);
    }
  };

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
        stopAudioVisualization();
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

      startAudioVisualization(stream);
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting audio recording:', error);
    }
  };

  const cancelRecording = () => {
    shouldTranscribeRef.current = false;
    setIsTranscribing(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      stopAudioVisualization();
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      }
      setIsRecording(false);
    }
  };

  const confirmRecording = () => {
    if (!isRecording || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }
    shouldTranscribeRef.current = true;
    setIsTranscribing(true);
    mediaRecorderRef.current.stop();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: inputValue,
          systemPrompt: getDashboardContext(timeframe, view, mainSection, portalApp),
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const responseText = data.response || 'Unable to process response';

      // build message, possibly with a widget
      let botMessage: Message;
      if (data.parsed && typeof data.parsed === 'object' && data.parsed.widget) {
        // parsed JSON from server includes widget definition
        botMessage = {
          id: (Date.now() + 1).toString(),
          text: data.parsed.text || responseText,
          sender: 'bot',
          timestamp: new Date(),
          widget: data.parsed.widget as ChatWidget,
        };
      } else {
        // fallback: maybe the text itself is JSON
        try {
          const parsed = JSON.parse(responseText);
          if (parsed && parsed.widget) {
            botMessage = {
              id: (Date.now() + 2).toString(),
              text: parsed.text || '',
              sender: 'bot',
              timestamp: new Date(),
              widget: parsed.widget as ChatWidget,
            };
          } else {
            throw new Error('no widget');
          }
        } catch (e) {
          botMessage = {
            id: (Date.now() + 1).toString(),
            text: responseText,
            sender: 'bot',
            timestamp: new Date(),
          };
        }
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error processing your request. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSpeech = async (messageId: string, text: string) => {
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice: 'nova' }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Update message with audio URL
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, audioUrl } : msg
        )
      );

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioPlayersRef.current[messageId] = audio;

      audio.onplay = () => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, isPlayingAudio: true } : msg
          )
        );
      };

      audio.onended = () => {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, isPlayingAudio: false } : msg
          )
        );
      };

      audio.play();
    } catch (error) {
      console.error('Error generating speech:', error);
    }
  };

  const toggleAudioPlayback = (messageId: string, text: string) => {
    const audio = audioPlayersRef.current[messageId];

    if (audio && audio.src) {
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    } else {
      generateSpeech(messageId, text);
    }
  };

  const stopAudioPlayback = (messageId: string) => {
    const audio = audioPlayersRef.current[messageId];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, isPlayingAudio: false } : msg
        )
      );
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Ignizia Copilot"
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full !p-0 shadow-lg hover:shadow-xl animate-in zoom-in duration-500 z-50"
      >
        <span className="material-icons-round text-white text-xl">
          {isOpen ? 'expand_more' : 'chat_bubble_outline'}
        </span>
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-8 w-96 h-[600px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700 z-50 animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-action rounded-t-2xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Ignizia Copilot</h3>
                <p className="text-slate-100 text-xs mt-1">Living Intelligence Assistant</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-action rounded-lg transition-colors"
              >
                <span className="material-icons-round text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap transition-all flex items-end gap-2 ${
                    message.sender === 'user'
                      ? 'bg-primary text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="flex-1">
                    {message.text}
                    {message.widget && <WidgetRenderer widget={message.widget} />}
                  </div>
                  {message.sender === 'bot' && (
                    <div className="relative flex-shrink-0 group">
                      <button
                        onClick={() => toggleAudioPlayback(message.id, message.text)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          message.isPlayingAudio
                            ? 'text-slate-600 dark:text-slate-300'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                        aria-label="Play message audio"
                        title="Play message as audio"
                      >
                        {message.isPlayingAudio ? (
                          <span className="material-icons-round text-base animate-spin">
                            autorenew
                          </span>
                        ) : (
                          <span className="material-icons-round text-base">
                            volume_up
                          </span>
                        )}
                      </button>
                      {message.isPlayingAudio && (
                        <button
                          onClick={() => stopAudioPlayback(message.id)}
                          className="absolute inset-0 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
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
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800 rounded-b-2xl">
            <div className="flex gap-3 items-center">
              {isRecording || isTranscribing ? (
                <div className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl flex items-center">
                  <AudioBars stream={audioStreamRef.current} isTranscribing={isTranscribing} />
                </div>
              ) : (
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-action text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 transition-all text-sm"
                  disabled={isLoading}
                />
              )}

              {isRecording || isTranscribing ? (
                isTranscribing ? (
                  <button
                    disabled
                    className="w-11 h-11 bg-primary text-white rounded-full flex items-center justify-center shadow-sm"
                    aria-label="Transcribing voice input"
                  >
                    <span className="material-icons-round text-lg animate-spin">
                      autorenew
                    </span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={cancelRecording}
                      disabled={isLoading}
                      className="w-11 h-11 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      aria-label="Cancel voice input"
                    >
                      <span className="material-icons-round text-base">close</span>
                    </button>
                    <button
                      onClick={confirmRecording}
                      disabled={isLoading}
                      className="w-11 h-11 bg-primary hover:bg-action text-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all"
                      aria-label="Send voice input"
                    >
                      <span className="material-icons-round text-lg">check</span>
                    </button>
                  </>
                )
              ) : inputValue.trim() ? (
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  size="md"
                  className="px-4"
                >
                  <span className="material-icons-round text-lg">send</span>
                </Button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={isLoading}
                  className="w-11 h-11 bg-primary hover:bg-action disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-full transition-all flex items-center justify-center shadow-sm hover:shadow-md disabled:cursor-not-allowed"
                  aria-label="Start voice input"
                >
                  <span className="material-icons-round text-lg">mic</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
