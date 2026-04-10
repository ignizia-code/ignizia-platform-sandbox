'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface Position {
  x: number;
  y: number;
}

interface OutputSchema {
  type: string;
  properties?: Record<string, { type: string; description?: string }>;
  required?: string[];
}

interface ModelCallNode {
  id: string;
  type: 'model-call';
  name: string;
  description: string;
  prompt: string;
  outputSchema: OutputSchema;
  inputs: string[]; // References to upstream node IDs
  position: Position;
}

interface ConditionalNode {
  id: string;
  type: 'conditional';
  name: string;
  description: string;
  inputPath: string; // JSON path from previous node
  condition: '==' | '!=' | 'exists' | 'contains';
  conditionValue: string;
  trueBranch: string | null; // Node ID
  falseBranch: string | null; // Node ID
  position: Position;
}

type WorkflowNode = ModelCallNode | ConditionalNode;

interface Connection {
  id: string;
  from: string;
  to: string;
  type: 'default' | 'true' | 'false';
}

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'testing' | 'published';
  nodes: WorkflowNode[];
  connections: Connection[];
  entryNodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
}

interface ExecutionResult {
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'success' | 'error';
  output?: unknown;
  error?: string;
  duration?: number;
}

type StudioView = 'gallery' | 'designer' | 'ai-builder';

// ============================================================================
// TEMPLATES
// ============================================================================

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'customer-support-triage',
    name: 'Customer Support Triage',
    description: 'Classifies customer inquiries and routes to appropriate response flow',
    icon: 'support_agent',
    category: 'Customer Service',
    agent: {
      name: 'Customer Support Triage',
      description: 'Classifies customer inquiries and routes them',
      nodes: [
        {
          id: 'classify-intent',
          type: 'model-call',
          name: 'Classify Intent',
          description: 'Classify the customer intent from their message',
          prompt: 'Analyze the following customer message and classify their intent:\n\nMessage: {{input.message}}\n\nClassify as one of: refund, support, billing, feedback, other',
          outputSchema: {
            type: 'object',
            properties: {
              intent: { type: 'string', description: 'The classified intent' },
              confidence: { type: 'number', description: 'Confidence score 0-1' },
              summary: { type: 'string', description: 'Brief summary of the request' }
            },
            required: ['intent', 'confidence', 'summary']
          },
          inputs: [],
          position: { x: 250, y: 100 }
        },
        {
          id: 'route-decision',
          type: 'conditional',
          name: 'Route by Intent',
          description: 'Route based on classified intent',
          inputPath: '$.intent',
          condition: '==',
          conditionValue: 'refund',
          trueBranch: 'refund-handler',
          falseBranch: 'general-support',
          position: { x: 250, y: 250 }
        },
        {
          id: 'refund-handler',
          type: 'model-call',
          name: 'Handle Refund',
          description: 'Generate refund response',
          prompt: 'Generate a helpful response for a refund request:\n\nOriginal request: {{input.message}}\nClassified summary: {{nodes.classify-intent.summary}}\n\nProvide a professional response addressing the refund request.',
          outputSchema: {
            type: 'object',
            properties: {
              response: { type: 'string', description: 'The response to send' },
              requiresEscalation: { type: 'boolean' }
            },
            required: ['response', 'requiresEscalation']
          },
          inputs: ['route-decision'],
          position: { x: 100, y: 400 }
        },
        {
          id: 'general-support',
          type: 'model-call',
          name: 'General Support',
          description: 'Generate general support response',
          prompt: 'Generate a helpful support response:\n\nOriginal request: {{input.message}}\nIntent: {{nodes.classify-intent.intent}}\nSummary: {{nodes.classify-intent.summary}}\n\nProvide a professional and helpful response.',
          outputSchema: {
            type: 'object',
            properties: {
              response: { type: 'string', description: 'The response to send' },
              suggestedActions: { type: 'array', description: 'Suggested follow-up actions' }
            },
            required: ['response']
          },
          inputs: ['route-decision'],
          position: { x: 400, y: 400 }
        }
      ],
      connections: [
        { id: 'c1', from: 'classify-intent', to: 'route-decision', type: 'default' },
        { id: 'c2', from: 'route-decision', to: 'refund-handler', type: 'true' },
        { id: 'c3', from: 'route-decision', to: 'general-support', type: 'false' }
      ],
      entryNodeId: 'classify-intent'
    }
  },
  {
    id: 'content-summarizer',
    name: 'Content Summarizer',
    description: 'Multi-step content analysis and summarization pipeline',
    icon: 'summarize',
    category: 'Content',
    agent: {
      name: 'Content Summarizer',
      description: 'Analyzes and summarizes content in multiple steps',
      nodes: [
        {
          id: 'extract-key-points',
          type: 'model-call',
          name: 'Extract Key Points',
          description: 'Extract main points from the content',
          prompt: 'Extract the key points from the following content:\n\n{{input.content}}\n\nList the main ideas and important details.',
          outputSchema: {
            type: 'object',
            properties: {
              keyPoints: { type: 'array', description: 'List of key points' },
              mainTopic: { type: 'string', description: 'The main topic' }
            },
            required: ['keyPoints', 'mainTopic']
          },
          inputs: [],
          position: { x: 250, y: 100 }
        },
        {
          id: 'generate-summary',
          type: 'model-call',
          name: 'Generate Summary',
          description: 'Create a concise summary',
          prompt: 'Based on these key points:\n{{nodes.extract-key-points.keyPoints}}\n\nMain topic: {{nodes.extract-key-points.mainTopic}}\n\nGenerate a concise summary in 2-3 sentences.',
          outputSchema: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: 'The generated summary' },
              wordCount: { type: 'number' }
            },
            required: ['summary']
          },
          inputs: ['extract-key-points'],
          position: { x: 250, y: 280 }
        }
      ],
      connections: [
        { id: 'c1', from: 'extract-key-points', to: 'generate-summary', type: 'default' }
      ],
      entryNodeId: 'extract-key-points'
    }
  },
  {
    id: 'data-extractor',
    name: 'Data Extractor',
    description: 'Extract structured data from unstructured text',
    icon: 'data_object',
    category: 'Data Processing',
    agent: {
      name: 'Data Extractor',
      description: 'Extracts structured data from text',
      nodes: [
        {
          id: 'extract-entities',
          type: 'model-call',
          name: 'Extract Entities',
          description: 'Extract named entities from text',
          prompt: 'Extract all named entities (people, organizations, locations, dates, amounts) from:\n\n{{input.text}}\n\nReturn structured data.',
          outputSchema: {
            type: 'object',
            properties: {
              people: { type: 'array', description: 'Names of people mentioned' },
              organizations: { type: 'array', description: 'Organization names' },
              locations: { type: 'array', description: 'Location names' },
              dates: { type: 'array', description: 'Dates mentioned' },
              amounts: { type: 'array', description: 'Monetary or numeric amounts' }
            }
          },
          inputs: [],
          position: { x: 250, y: 150 }
        }
      ],
      connections: [],
      entryNodeId: 'extract-entities'
    }
  },
  {
    id: 'sentiment-analyzer',
    name: 'Sentiment Analyzer',
    description: 'Analyze sentiment with conditional response generation',
    icon: 'mood',
    category: 'Analysis',
    agent: {
      name: 'Sentiment Analyzer',
      description: 'Analyzes sentiment and generates appropriate responses',
      nodes: [
        {
          id: 'analyze-sentiment',
          type: 'model-call',
          name: 'Analyze Sentiment',
          description: 'Determine sentiment of the input',
          prompt: 'Analyze the sentiment of this text:\n\n{{input.text}}\n\nDetermine if it is positive, negative, or neutral.',
          outputSchema: {
            type: 'object',
            properties: {
              sentiment: { type: 'string', description: 'positive, negative, or neutral' },
              score: { type: 'number', description: 'Sentiment score -1 to 1' },
              aspects: { type: 'array', description: 'Key aspects mentioned' }
            },
            required: ['sentiment', 'score']
          },
          inputs: [],
          position: { x: 250, y: 100 }
        },
        {
          id: 'check-negative',
          type: 'conditional',
          name: 'Check if Negative',
          description: 'Route based on sentiment',
          inputPath: '$.sentiment',
          condition: '==',
          conditionValue: 'negative',
          trueBranch: 'escalation-response',
          falseBranch: 'standard-response',
          position: { x: 250, y: 250 }
        },
        {
          id: 'escalation-response',
          type: 'model-call',
          name: 'Escalation Response',
          description: 'Generate escalation response for negative sentiment',
          prompt: 'Generate an empathetic response for negative feedback:\n\nOriginal: {{input.text}}\nSentiment score: {{nodes.analyze-sentiment.score}}\n\nShow understanding and offer to escalate.',
          outputSchema: {
            type: 'object',
            properties: {
              response: { type: 'string' },
              escalate: { type: 'boolean' }
            },
            required: ['response', 'escalate']
          },
          inputs: ['check-negative'],
          position: { x: 100, y: 400 }
        },
        {
          id: 'standard-response',
          type: 'model-call',
          name: 'Standard Response',
          description: 'Generate standard positive/neutral response',
          prompt: 'Generate a friendly response:\n\nOriginal: {{input.text}}\nSentiment: {{nodes.analyze-sentiment.sentiment}}\n\nProvide an appropriate response.',
          outputSchema: {
            type: 'object',
            properties: {
              response: { type: 'string' },
              followUp: { type: 'string' }
            },
            required: ['response']
          },
          inputs: ['check-negative'],
          position: { x: 400, y: 400 }
        }
      ],
      connections: [
        { id: 'c1', from: 'analyze-sentiment', to: 'check-negative', type: 'default' },
        { id: 'c2', from: 'check-negative', to: 'escalation-response', type: 'true' },
        { id: 'c3', from: 'check-negative', to: 'standard-response', type: 'false' }
      ],
      entryNodeId: 'analyze-sentiment'
    }
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateId = () => Math.random().toString(36).substr(2, 9);

const createDefaultModelNode = (position: Position): ModelCallNode => ({
  id: generateId(),
  type: 'model-call',
  name: 'New Model Call',
  description: 'Process the input and generate a response',
  prompt: 'Process the following input and provide a helpful response:\n\n{{input}}',
  outputSchema: {
    type: 'object',
    properties: {
      result: { type: 'string', description: 'The processed result' },
      summary: { type: 'string', description: 'A brief summary' }
    },
    required: ['result']
  },
  inputs: [],
  position
});

const createDefaultConditionalNode = (position: Position): ConditionalNode => ({
  id: generateId(),
  type: 'conditional',
  name: 'New Condition',
  description: 'Configure condition',
  inputPath: '',
  condition: '==',
  conditionValue: '',
  trueBranch: null,
  falseBranch: null,
  position
});

const createNewAgent = (): Agent => ({
  id: generateId(),
  name: 'New Agent',
  description: 'Describe your agent workflow',
  status: 'draft',
  nodes: [],
  connections: [],
  entryNodeId: null,
  createdAt: new Date(),
  updatedAt: new Date()
});

// ============================================================================
// COMPONENTS
// ============================================================================

// Templates Gallery Component
const TemplatesGallery: React.FC<{
  onSelectTemplate: (template: AgentTemplate) => void;
  onCreateFromScratch: () => void;
  onOpenAIBuilder: () => void;
}> = ({ onSelectTemplate, onCreateFromScratch, onOpenAIBuilder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(AGENT_TEMPLATES.map(t => t.category))];
  
  const filteredTemplates = AGENT_TEMPLATES.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Agent Studio</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Create intelligent agents with deterministic workflows. Start from a template or build from scratch.
        </p>
      </div>

      {/* Create Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={onCreateFromScratch}
          className="group p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-accent dark:hover:border-accent transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-2xl">add</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Create from Scratch</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Design your workflow manually with drag-and-drop
          </p>
        </button>

        <button
          onClick={onOpenAIBuilder}
          className="group p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-cyan-500 dark:hover:border-cyan-500 transition-all hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
        >
          <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <span className="material-icons-round text-2xl">auto_awesome</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Build with AI</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Describe your agent in natural language
          </p>
        </button>

        <div className="p-5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary dark:text-slate-300 flex items-center justify-center mb-3">
            <span className="material-icons-round text-2xl">school</span>
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Learn More</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Agents are workflows of LLM calls with conditional logic
          </p>
        </div>
      </div>

      {/* Templates Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Templates</h3>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <span className="material-icons-round absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
              !selectedCategory
                ? 'bg-accent/20 dark:bg-accent/30 text-accent'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-accent/20 dark:bg-accent/30 text-accent'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="group bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-accent dark:hover:border-accent hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                  <span className="material-icons-round">{template.icon}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                  {template.category}
                </span>
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-1">{template.name}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                {template.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {template.agent.nodes.length} nodes
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectTemplate(template)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Workflow Canvas Component
const WorkflowCanvas: React.FC<{
  agent: Agent;
  onUpdateAgent: (agent: Agent) => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  isConnecting: boolean;
  connectingFrom: string | null;
  onStartConnection: (nodeId: string) => void;
  onEndConnection: (nodeId: string) => void;
}> = ({ 
  agent, 
  onUpdateAgent, 
  selectedNodeId, 
  onSelectNode, 
  isConnecting, 
  connectingFrom, 
  onStartConnection, 
  onEndConnection 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef({ isDragging: false, draggedNodeId: null as string | null, dragOffsetX: 0, dragOffsetY: 0, canvasOffsetX: 0, canvasOffsetY: 0, isPanning: false, panStartX: 0, panStartY: 0 });
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef({ x: 0, y: 0 });

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (isConnecting) {
      onEndConnection(nodeId);
      return;
    }
    
    e.stopPropagation();
    const node = agent.nodes.find(n => n.id === nodeId);
    if (!node) return;

    setIsDragging(true);
    setDraggedNode(nodeId);
    const offset = {
      x: e.clientX - node.position.x - canvasOffset.x,
      y: e.clientY - node.position.y - canvasOffset.y
    };
    setDragOffset(offset);
    dragStateRef.current = {
      isDragging: true,
      draggedNodeId: nodeId,
      dragOffsetX: offset.x,
      dragOffsetY: offset.y,
      canvasOffsetX: canvasOffset.x,
      canvasOffsetY: canvasOffset.y,
      isPanning: false,
      panStartX: 0,
      panStartY: 0
    };
    onSelectNode(nodeId);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onSelectNode(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
      dragStateRef.current = {
        isDragging: false,
        draggedNodeId: null,
        dragOffsetX: 0,
        dragOffsetY: 0,
        canvasOffsetX: canvasOffset.x,
        canvasOffsetY: canvasOffset.y,
        isPanning: true,
        panStartX: e.clientX - canvasOffset.x,
        panStartY: e.clientY - canvasOffset.y
      };
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const state = dragStateRef.current;
    
    if (state.isDragging && state.draggedNodeId) {
      const newX = e.clientX - state.dragOffsetX - state.canvasOffsetX;
      const newY = e.clientY - state.dragOffsetY - state.canvasOffsetY;
      
      // Only update if position actually changed
      if (Math.abs(newX - lastUpdateRef.current.x) > 0.5 || Math.abs(newY - lastUpdateRef.current.y) > 0.5) {
        lastUpdateRef.current = { x: newX, y: newY };
        
        // Debounce the agent update
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = setTimeout(() => {
          const newNodes = agent.nodes.map(node => {
            if (node.id === state.draggedNodeId) {
              return {
                ...node,
                position: {
                  x: newX,
                  y: newY
                }
              };
            }
            return node;
          });
          onUpdateAgent({ ...agent, nodes: newNodes });
        }, 0);
      }
    } else if (state.isPanning) {
      const newOffsetX = e.clientX - state.panStartX;
      const newOffsetY = e.clientY - state.panStartY;
      
      if (Math.abs(newOffsetX - canvasOffset.x) > 0.5 || Math.abs(newOffsetY - canvasOffset.y) > 0.5) {
        setCanvasOffset({
          x: newOffsetX,
          y: newOffsetY
        });
      }
    }
  }, [agent, onUpdateAgent, canvasOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNode(null);
    setIsPanning(false);
    dragStateRef.current = { isDragging: false, draggedNodeId: null, dragOffsetX: 0, dragOffsetY: 0, canvasOffsetX: 0, canvasOffsetY: 0, isPanning: false, panStartX: 0, panStartY: 0 };
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
  }, []);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const position = {
      x: e.clientX - rect.left - canvasOffset.x,
      y: e.clientY - rect.top - canvasOffset.y
    };

    const newNode = createDefaultModelNode(position);
    const newAgent = {
      ...agent,
      nodes: [...agent.nodes, newNode],
      entryNodeId: agent.entryNodeId || newNode.id
    };
    onUpdateAgent(newAgent);
    onSelectNode(newNode.id);
  };

  const getNodeColor = (node: WorkflowNode, isSelected: boolean) => {
    if (isSelected) {
      return 'border-accent ring-2 ring-accent/30';
    }
    if (node.type === 'conditional') {
      return 'border-cyan-400 dark:border-cyan-500';
    }
    return 'border-slate-200 dark:border-slate-700';
  };

  const renderConnections = useCallback(() => {
    return agent.connections.map(conn => {
      const fromNode = agent.nodes.find(n => n.id === conn.from);
      const toNode = agent.nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return null;

      const startX = fromNode.position.x + 140 + canvasOffset.x;
      const startY = fromNode.position.y + (fromNode.type === 'conditional' ? 70 : 50) + canvasOffset.y;
      const endX = toNode.position.x + 140 + canvasOffset.x;
      const endY = toNode.position.y + canvasOffset.y;

      const midY = (startY + endY) / 2;
      const path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

      let strokeColor = 'stroke-slate-300 dark:stroke-slate-600';
      if (conn.type === 'true') strokeColor = 'stroke-emerald-500';
      if (conn.type === 'false') strokeColor = 'stroke-red-400';

      return (
        <g key={conn.id}>
          <path
            d={path}
            fill="none"
            className={`${strokeColor}`}
            strokeWidth={2}
            markerEnd="url(#arrowhead)"
          />
          {conn.type !== 'default' && (
            <text
              x={(startX + endX) / 2}
              y={midY - 10}
              className="fill-slate-500 dark:fill-slate-400 text-xs"
              textAnchor="middle"
            >
              {conn.type}
            </text>
          )}
        </g>
      );
    });
  }, [agent.connections, agent.nodes, canvasOffset]);

  return (
    <div
      ref={canvasRef}
      className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      style={{ userSelect: 'none', willChange: 'transform' }}
    >
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-30 dark:opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: `${canvasOffset.x % 20}px ${canvasOffset.y % 20}px`,
          willChange: 'background-position'
        }}
      />

      {/* SVG for connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ willChange: 'auto' }}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className="fill-slate-400 dark:fill-slate-500"
            />
          </marker>
        </defs>
        {renderConnections()}
      </svg>

      {/* Nodes */}
      {agent.nodes.map(node => (
        <div
          key={node.id}
          className={`absolute w-72 rounded-xl border-2 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-move ${getNodeColor(node, selectedNodeId === node.id)}`}
          style={{
            left: `${node.position.x + canvasOffset.x}px`,
            top: `${node.position.y + canvasOffset.y}px`,
            transform: 'translate(0, 0)',
            willChange: isDragging && draggedNode === node.id ? 'transform' : 'auto',
            transition: isDragging && draggedNode === node.id ? 'none' : 'box-shadow 0.2s ease'
          }}
          onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
        >
          {/* Node Header */}
          <div className={`px-4 py-3 border-b dark:border-slate-700 rounded-t-xl ${
            node.type === 'conditional' 
              ? 'bg-cyan-50 dark:bg-cyan-950/30' 
              : 'bg-accent/10 dark:bg-accent/20'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`material-icons-round text-lg ${
                node.type === 'conditional' 
                  ? 'text-cyan-600 dark:text-cyan-400' 
                  : 'text-accent'
              }`}>
                {node.type === 'conditional' ? 'call_split' : 'psychology'}
              </span>
              <span className="font-medium text-sm text-slate-900 dark:text-white truncate">
                {node.name}
              </span>
              {agent.entryNodeId === node.id && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-accent/20 dark:bg-accent/30 text-accent">
                  Entry
                </span>
              )}
            </div>
          </div>
          
          {/* Node Body */}
          <div className="px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {node.description || 'No description'}
            </p>
            
            {node.type === 'model-call' && (
              <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                {(node as ModelCallNode).prompt.slice(0, 50)}...
              </div>
            )}
            
            {node.type === 'conditional' && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                <span className="text-amber-600 dark:text-amber-400 font-mono">
                  {(node as ConditionalNode).inputPath || '$.field'}
                </span>
                <span className="text-slate-400">{(node as ConditionalNode).condition}</span>
                <span className="text-purple-600 dark:text-purple-400 font-mono">
                  &quot;{(node as ConditionalNode).conditionValue}&quot;
                </span>
              </div>
            )}
          </div>

          {/* Connection Button */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartConnection(node.id);
              }}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                isConnecting && connectingFrom === node.id
                  ? 'bg-accent border-accent text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 hover:border-accent hover:text-accent'
              }`}
            >
              <span className="material-icons-round text-sm">
                {isConnecting && connectingFrom === node.id ? 'close' : 'add'}
              </span>
            </button>
          </div>
        </div>
      ))}

      {/* Empty State */}
      {agent.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <span className="material-icons-round text-3xl text-slate-400">add_circle_outline</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Start Building
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              Double-click on the canvas to add a node, or drag nodes from the toolbar
            </p>
          </div>
        </div>
      )}

      {/* Connection Mode Indicator */}
      {isConnecting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium shadow-lg pointer-events-none">
          Click on a node to connect
        </div>
      )}
    </div>
  );
};

// Node Editor Panel
const NodeEditorPanel: React.FC<{
  node: WorkflowNode | null;
  onUpdateNode: (node: WorkflowNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onSetAsEntry: (nodeId: string) => void;
  allNodes: WorkflowNode[];
}> = ({ node, onUpdateNode, onDeleteNode, onSetAsEntry, allNodes }) => {
  if (!node) {
    return (
      <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-6 flex items-center justify-center">
        <div className="text-center">
          <span className="material-icons-round text-4xl text-slate-300 dark:text-slate-600 mb-3">
            touch_app
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Select a node to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const isModelCall = node.type === 'model-call';
  const modelNode = node as ModelCallNode;
  const conditionalNode = node as ConditionalNode;

  return (
    <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`material-icons-round ${
            isModelCall ? 'text-accent' : 'text-cyan-500'
          }`}>
            {isModelCall ? 'psychology' : 'call_split'}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white text-sm">
            {isModelCall ? 'Model Call' : 'Conditional'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onSetAsEntry(node.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-accent/10 dark:hover:bg-accent/20 transition-colors"
            title="Set as entry point"
          >
            <span className="material-icons-round text-lg">flag</span>
          </button>
          <button
            onClick={() => onDeleteNode(node.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete node"
          >
            <span className="material-icons-round text-lg">delete</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdateNode({ ...node, name: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Description
          </label>
          <input
            type="text"
            value={node.description}
            onChange={(e) => onUpdateNode({ ...node, description: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
          />
        </div>

        {isModelCall ? (
          <>
            {/* Prompt */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Prompt
              </label>
              <textarea
                value={modelNode.prompt}
                onChange={(e) => onUpdateNode({ ...modelNode, prompt: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none font-mono"
                placeholder="Enter prompt. Use {{nodes.nodeName.field}} for references"
              />
              <p className="mt-1 text-xs text-slate-400">
                Use {"{{input.field}}"} or {"{{nodes.nodeId.field}}"} for templating
              </p>
            </div>

            {/* Output Schema */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Output Schema (JSON)
              </label>
              <textarea
                value={JSON.stringify(modelNode.outputSchema, null, 2)}
                onChange={(e) => {
                  try {
                    const schema = JSON.parse(e.target.value);
                    onUpdateNode({ ...modelNode, outputSchema: schema });
                  } catch {
                    // Invalid JSON, don't update
                  }
                }}
                rows={8}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 resize-none font-mono text-xs"
              />
            </div>
          </>
        ) : (
          <>
            {/* Input Path */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Input Path (JSON Path)
              </label>
              <input
                type="text"
                value={conditionalNode.inputPath}
                onChange={(e) => onUpdateNode({ ...conditionalNode, inputPath: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 font-mono"
                placeholder="$.field.name"
              />
            </div>

            {/* Condition */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Condition
              </label>
              <select
                value={conditionalNode.condition}
                onChange={(e) => onUpdateNode({ 
                  ...conditionalNode, 
                  condition: e.target.value as ConditionalNode['condition'] 
                })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              >
                <option value="==">Equals (==)</option>
                <option value="!=">Not Equals (!=)</option>
                <option value="exists">Exists</option>
                <option value="contains">Contains</option>
              </select>
            </div>

            {/* Condition Value */}
            {conditionalNode.condition !== 'exists' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Value
                </label>
                <input
                  type="text"
                  value={conditionalNode.conditionValue}
                  onChange={(e) => onUpdateNode({ ...conditionalNode, conditionValue: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                  placeholder="Value to compare"
                />
              </div>
            )}

            {/* Branch Targets */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1.5">
                  True Branch
                </label>
                <select
                  value={conditionalNode.trueBranch || ''}
                  onChange={(e) => onUpdateNode({ 
                    ...conditionalNode, 
                    trueBranch: e.target.value || null 
                  })}
                  className="w-full px-2 py-2 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="">None</option>
                  {allNodes.filter(n => n.id !== node.id).map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-red-600 dark:text-red-400 mb-1.5">
                  False Branch
                </label>
                <select
                  value={conditionalNode.falseBranch || ''}
                  onChange={(e) => onUpdateNode({ 
                    ...conditionalNode, 
                    falseBranch: e.target.value || null 
                  })}
                  className="w-full px-2 py-2 text-xs rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                >
                  <option value="">None</option>
                  {allNodes.filter(n => n.id !== node.id).map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Type for AI response with workflow
interface AIWorkflowResponse {
  workflow?: {
    name: string;
    description: string;
    nodes: WorkflowNode[];
    connections: Connection[];
    entryNodeId: string;
  };
  explanation?: string;
}

// AI Builder Panel
const AIBuilderPanel: React.FC<{
  agent: Agent;
  onUpdateAgent: (agent: Agent) => void;
  onClose: () => void;
}> = ({ agent, onUpdateAgent, onClose }) => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content: `Hi! I'm your AI workflow architect. I can help you design agent workflows by understanding your requirements.

**What I can build:**
• Model Call nodes - LLM calls with structured outputs
• Conditional nodes - If/else branching logic
• Multi-step workflows - Chain nodes together

**How to use me:**
1. Describe what you want your agent to do
2. I'll design a workflow and show you a preview
3. Click "Apply to Canvas" to add it to your workspace

What kind of agent would you like to build?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [proposedChanges, setProposedChanges] = useState<Agent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse workflow JSON from AI response
  const parseWorkflowFromResponse = (response: string): AIWorkflowResponse | null => {
    // Try to extract JSON from code block
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('Failed to parse workflow JSON:', e);
        return null;
      }
    }
    
    // Try to parse as direct JSON
    try {
      const parsed = JSON.parse(response);
      if (parsed.workflow) {
        return parsed;
      }
    } catch {
      // Not JSON, that's fine
    }
    
    return null;
  };

  // Extract display message from AI response (removing JSON blocks)
  const extractDisplayMessage = (response: string, parsedWorkflow: AIWorkflowResponse | null): string => {
    // If we parsed a workflow, use the explanation
    if (parsedWorkflow?.explanation) {
      return parsedWorkflow.explanation;
    }
    
    // Remove JSON code blocks from display
    let displayMessage = response.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
    
    // If nothing left, provide a default message
    if (!displayMessage) {
      displayMessage = "I've designed a workflow for you. Click 'Apply to Canvas' to see it in action!";
    }
    
    return displayMessage;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to state
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Call API instead of client-side OpenAI
      const response = await fetch('/api/ai-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          agent
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.response || '';
      
      // Try to parse workflow from response
      const parsedWorkflow = parseWorkflowFromResponse(aiResponse);
      
      // Extract display message
      const displayMessage = extractDisplayMessage(aiResponse, parsedWorkflow);
      
      // Add assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: displayMessage }]);
      
      // If we got a valid workflow, create proposed changes
      if (parsedWorkflow?.workflow) {
        const workflow = parsedWorkflow.workflow;
        const proposedAgent: Agent = {
          ...agent,
          name: workflow.name || agent.name,
          description: workflow.description || agent.description,
          nodes: workflow.nodes || [],
          connections: workflow.connections || [],
          entryNodeId: workflow.entryNodeId || null
        };
        setProposedChanges(proposedAgent);
      }
    } catch (error) {
      console.error('Error calling API:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error processing your request. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyProposedChanges = () => {
    if (proposedChanges) {
      onUpdateAgent(proposedChanges);
      setProposedChanges(null);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Workflow applied! You can see "${proposedChanges.name}" on the canvas now.\n\n**Next steps:**\n• Click on any node to edit its properties\n• Drag nodes to rearrange them\n• Use the "Test" button to run the workflow\n\nWant me to modify anything?`
      }]);
    }
  };

  return (
    <div className="w-96 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center">
            <span className="material-icons-round text-cyan-600 dark:text-cyan-400">auto_awesome</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">AI Builder</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Describe your agent</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="material-icons-round text-lg">close</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        {proposedChanges && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-icons-round text-purple-600 dark:text-purple-400">preview</span>
              <span className="font-medium text-purple-900 dark:text-purple-100 text-sm">
                Proposed Workflow
              </span>
            </div>
            <div className="text-xs text-purple-700 dark:text-purple-300 mb-3 space-y-1">
              <p><strong>{proposedChanges.name}</strong></p>
              <p>{proposedChanges.nodes.length} node{proposedChanges.nodes.length !== 1 ? 's' : ''}: {proposedChanges.nodes.map(n => n.name).join(', ')}</p>
              {proposedChanges.connections.length > 0 && (
                <p>{proposedChanges.connections.length} connection{proposedChanges.connections.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <button
              onClick={applyProposedChanges}
              className="w-full py-2 px-4 rounded-lg bg-purple-500 text-white text-sm font-medium hover:bg-purple-600 transition-colors"
            >
              Apply to Canvas
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Describe your agent..."
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-icons-round text-lg">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Execution Panel
const ExecutionPanel: React.FC<{
  agent: Agent;
  onClose: () => void;
}> = ({ agent, onClose }) => {
  const [testInput, setTestInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ExecutionResult[]>([]);
  const [currentNodeIndex, setCurrentNodeIndex] = useState(-1);
  const [executionContext, setExecutionContext] = useState<Record<string, unknown>>({});

  // Interpolate template variables in prompts
  const interpolatePrompt = (prompt: string, input: string, nodeOutputs: Record<string, unknown>): string => {
    let interpolated = prompt;
    
    // Parse input - could be plain text or JSON
    let inputObj: Record<string, unknown> = {};
    try {
      inputObj = JSON.parse(input);
    } catch {
      // If not JSON, treat as a message/text field
      inputObj = { message: input, text: input, content: input };
    }
    
    // Replace {{input.xxx}} patterns
    interpolated = interpolated.replace(/\{\{input\.(\w+)\}\}/g, (_, key) => {
      return String(inputObj[key] ?? input);
    });
    
    // Replace {{input}} with the raw input
    interpolated = interpolated.replace(/\{\{input\}\}/g, input);
    
    // Replace {{nodes.nodeId.field}} patterns
    interpolated = interpolated.replace(/\{\{nodes\.([^.}]+)\.([^}]+)\}\}/g, (_, nodeId, field) => {
      const nodeOutput = nodeOutputs[nodeId];
      if (nodeOutput && typeof nodeOutput === 'object') {
        const value = (nodeOutput as Record<string, unknown>)[field];
        if (Array.isArray(value)) {
          return JSON.stringify(value);
        }
        return String(value ?? '');
      }
      return '';
    });
    
    // Replace {{nodes.nodeId}} patterns (entire output)
    interpolated = interpolated.replace(/\{\{nodes\.([^.}]+)\}\}/g, (_, nodeId) => {
      const nodeOutput = nodeOutputs[nodeId];
      return nodeOutput ? JSON.stringify(nodeOutput) : '';
    });
    
    return interpolated;
  };

  // Evaluate condition for conditional nodes
  const evaluateCondition = (
    node: ConditionalNode, 
    nodeOutputs: Record<string, unknown>
  ): boolean => {
    // Parse the input path to get the value
    // Format: $.fieldName or just fieldName
    const pathParts = node.inputPath.replace(/^\$\.?/, '').split('.');
    
    // Find the upstream node output
    const upstreamConnection = agent.connections.find(c => c.to === node.id);
    if (!upstreamConnection) return false;
    
    let value: unknown = nodeOutputs[upstreamConnection.from];
    
    // Navigate to the nested field
    for (const part of pathParts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }
    
    const stringValue = String(value ?? '').toLowerCase();
    const conditionValue = node.conditionValue.toLowerCase();
    
    switch (node.condition) {
      case '==':
        return stringValue === conditionValue;
      case '!=':
        return stringValue !== conditionValue;
      case 'exists':
        return value !== undefined && value !== null && value !== '';
      case 'contains':
        return stringValue.includes(conditionValue);
      default:
        return false;
    }
  };

  // Execute a model call node using API
  const executeModelNode = async (
    node: ModelCallNode, 
    input: string, 
    nodeOutputs: Record<string, unknown>
  ): Promise<unknown> => {
    const interpolatedPrompt = interpolatePrompt(node.prompt, input, nodeOutputs);
    
    try {
      const response = await fetch('/api/execute-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeName: node.name,
          nodeDescription: node.description,
          prompt: interpolatedPrompt,
          outputSchema: node.outputSchema
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.output || {};
    } catch (error) {
      console.error('Error executing model node:', error);
      return { rawResponse: String(error), parseError: true };
    }
  };

  const runWorkflow = async () => {
    if (!testInput.trim() || !agent.entryNodeId) return;

    setIsRunning(true);
    setResults([]);
    setCurrentNodeIndex(0);
    
    const nodeOutputs: Record<string, unknown> = {};
    const newResults: ExecutionResult[] = [];

    // Build execution order following the DAG
    const executionOrder = getExecutionOrder(agent, nodeOutputs);

    for (let i = 0; i < executionOrder.length; i++) {
      const node = executionOrder[i];
      setCurrentNodeIndex(i);

      // Mark as running
      newResults.push({
        nodeId: node.id,
        nodeName: node.name,
        status: 'running'
      });
      setResults([...newResults]);

      const startTime = Date.now();

      try {
        let output: unknown;

        if (node.type === 'model-call') {
          // Execute LLM call
          output = await executeModelNode(node as ModelCallNode, testInput, nodeOutputs);
        } else if (node.type === 'conditional') {
          // Evaluate condition
          const condNode = node as ConditionalNode;
          const result = evaluateCondition(condNode, nodeOutputs);
          output = { 
            conditionResult: result, 
            matchedBranch: result ? 'true' : 'false',
            evaluatedPath: condNode.inputPath,
            condition: `${condNode.condition} "${condNode.conditionValue}"`
          };
          
          // Update execution order based on condition result
          const nextNodeId = result ? condNode.trueBranch : condNode.falseBranch;
          if (nextNodeId) {
            const nextNode = agent.nodes.find(n => n.id === nextNodeId);
            if (nextNode && !executionOrder.slice(i + 1).includes(nextNode)) {
              // Remove the other branch from execution
              const otherBranchId = result ? condNode.falseBranch : condNode.trueBranch;
              const filteredOrder = executionOrder.filter((n, idx) => 
                idx <= i || n.id !== otherBranchId
              );
              executionOrder.length = 0;
              executionOrder.push(...filteredOrder);
            }
          }
        }

        const duration = Date.now() - startTime;
        nodeOutputs[node.id] = output;
        
        newResults[i] = {
          nodeId: node.id,
          nodeName: node.name,
          status: 'success',
          output,
          duration
        };
        setResults([...newResults]);
        setExecutionContext({ ...nodeOutputs });

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        newResults[i] = {
          nodeId: node.id,
          nodeName: node.name,
          status: 'error',
          error: errorMessage,
          duration
        };
        setResults([...newResults]);
        
        // Stop execution on error
        break;
      }
    }

    setIsRunning(false);
    setCurrentNodeIndex(-1);
  };

  const getExecutionOrder = (agent: Agent, _nodeOutputs: Record<string, unknown>): WorkflowNode[] => {
    // Simple BFS traversal from entry node
    if (!agent.entryNodeId) return agent.nodes;
    
    const visited = new Set<string>();
    const order: WorkflowNode[] = [];
    const queue = [agent.entryNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = agent.nodes.find(n => n.id === nodeId);
      if (!node) continue;
      order.push(node);

      // Find connected nodes
      const connections = agent.connections.filter(c => c.from === nodeId);
      connections.forEach(c => queue.push(c.to));
    }

    return order;
  };

  return (
    <div className="absolute inset-0 bg-white dark:bg-slate-800 z-10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-icons-round text-primary">play_circle</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Test Workflow</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Run your agent with sample input
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="material-icons-round">close</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Input Section */}
        <div className="w-1/3 p-6 border-r border-slate-200 dark:border-slate-700">
          <h4 className="font-medium text-slate-900 dark:text-white mb-4">Test Input</h4>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
            placeholder="Enter your test input here. For example:&#10;&#10;'I want a refund for my order'&#10;&#10;or JSON like:&#10;{&quot;message&quot;: &quot;Hello&quot;, &quot;user&quot;: &quot;John&quot;}&#10;&#10;This will be available as {{input}} in your prompts."
            disabled={isRunning}
          />
          
          <button
            onClick={runWorkflow}
            disabled={!testInput.trim() || !agent.entryNodeId || isRunning}
            className="mt-4 w-full py-3 px-4 rounded-xl bg-primary text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <span className="material-icons-round animate-spin text-lg">refresh</span>
                Running...
              </>
            ) : (
              <>
                <span className="material-icons-round text-lg">play_arrow</span>
                Run Workflow
              </>
            )}
          </button>

          {!agent.entryNodeId && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="material-icons-round text-sm">warning</span>
              Set an entry node before running
            </p>
          )}
        </div>

        {/* Results Section */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h4 className="font-medium text-slate-900 dark:text-white mb-4">Execution Results</h4>
          
          {results.length === 0 && !isRunning && (
            <div className="text-center py-12">
              <span className="material-icons-round text-5xl text-slate-300 dark:text-slate-600 mb-3">
                terminal
              </span>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Run the workflow to see results here
              </p>
            </div>
          )}

          <div className="space-y-4">
            {results.map((result, i) => (
              <div
                key={result.nodeId}
                className={`rounded-xl border overflow-hidden transition-all ${
                  result.status === 'running'
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                    : result.status === 'success'
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
                    : result.status === 'error'
                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'
                }`}
              >
                {/* Node Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-inherit">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      result.status === 'running'
                        ? 'bg-blue-500 text-white'
                        : result.status === 'success'
                        ? 'bg-emerald-500 text-white'
                        : result.status === 'error'
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                    }`}>
                      {result.status === 'running' ? (
                        <span className="material-icons-round text-sm animate-spin">refresh</span>
                      ) : result.status === 'success' ? (
                        <span className="material-icons-round text-sm">check</span>
                      ) : result.status === 'error' ? (
                        <span className="material-icons-round text-sm">close</span>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="font-medium text-sm text-slate-900 dark:text-white">
                      {result.nodeName}
                    </span>
                  </div>
                  {result.duration && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {result.duration}ms
                    </span>
                  )}
                </div>

                {/* Output */}
                {result.output != null && (
                  <div className="px-4 py-3">
                    <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(result.output, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Error */}
                {result.error && (
                  <div className="px-4 py-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Agent Designer Component
const AgentDesigner: React.FC<{
  agent: Agent;
  onUpdateAgent: (agent: Agent) => void;
  onBack: () => void;
  showAIBuilder: boolean;
  onToggleAIBuilder: () => void;
}> = ({ agent, onUpdateAgent, onBack, showAIBuilder, onToggleAIBuilder }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [showExecution, setShowExecution] = useState(false);

  const selectedNode = agent.nodes.find(n => n.id === selectedNodeId) || null;

  const handleStartConnection = (nodeId: string) => {
    if (isConnecting && connectingFrom === nodeId) {
      setIsConnecting(false);
      setConnectingFrom(null);
    } else {
      setIsConnecting(true);
      setConnectingFrom(nodeId);
    }
  };

  const handleEndConnection = (nodeId: string) => {
    if (!connectingFrom || connectingFrom === nodeId) {
      setIsConnecting(false);
      setConnectingFrom(null);
      return;
    }

    // Check if connection already exists
    const existingConnection = agent.connections.find(
      c => c.from === connectingFrom && c.to === nodeId
    );

    if (!existingConnection) {
      const newConnection: Connection = {
        id: generateId(),
        from: connectingFrom,
        to: nodeId,
        type: 'default'
      };
      onUpdateAgent({
        ...agent,
        connections: [...agent.connections, newConnection]
      });
    }

    setIsConnecting(false);
    setConnectingFrom(null);
  };

  const handleUpdateNode = (updatedNode: WorkflowNode) => {
    const newNodes = agent.nodes.map(n => 
      n.id === updatedNode.id ? updatedNode : n
    );
    onUpdateAgent({ ...agent, nodes: newNodes });
  };

  const handleDeleteNode = (nodeId: string) => {
    const newNodes = agent.nodes.filter(n => n.id !== nodeId);
    const newConnections = agent.connections.filter(
      c => c.from !== nodeId && c.to !== nodeId
    );
    const newEntryId = agent.entryNodeId === nodeId 
      ? (newNodes[0]?.id || null) 
      : agent.entryNodeId;
    
    onUpdateAgent({
      ...agent,
      nodes: newNodes,
      connections: newConnections,
      entryNodeId: newEntryId
    });
    setSelectedNodeId(null);
  };

  const handleSetAsEntry = (nodeId: string) => {
    onUpdateAgent({ ...agent, entryNodeId: nodeId });
  };

  const addNode = (type: 'model-call' | 'conditional') => {
    const position = {
      x: 200 + Math.random() * 100,
      y: 100 + agent.nodes.length * 150
    };
    
    const newNode = type === 'model-call' 
      ? createDefaultModelNode(position)
      : createDefaultConditionalNode(position);
    
    const newAgent = {
      ...agent,
      nodes: [...agent.nodes, newNode],
      entryNodeId: agent.entryNodeId || newNode.id
    };
    onUpdateAgent(newAgent);
    setSelectedNodeId(newNode.id);
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-icons-round">arrow_back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={agent.name}
              onChange={(e) => onUpdateAgent({ ...agent, name: e.target.value })}
              className="text-lg font-semibold text-slate-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0"
            />
            <span className={`text-xs px-2 py-1 rounded-full ${
              agent.status === 'draft' 
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                : agent.status === 'testing'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
            }`}>
              {agent.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Node Buttons */}
          <div className="flex items-center gap-1 mr-4 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">
            <button
              onClick={() => addNode('model-call')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-accent hover:bg-accent/10 dark:hover:bg-accent/20 transition-colors"
            >
              <span className="material-icons-round text-lg">psychology</span>
              Model Call
            </button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
            <button
              onClick={() => addNode('conditional')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
            >
              <span className="material-icons-round text-lg">call_split</span>
              Condition
            </button>
          </div>

          <button
            onClick={onToggleAIBuilder}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showAIBuilder
                ? 'bg-cyan-500 text-white'
                : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-200 dark:hover:bg-cyan-900'
            }`}
          >
            <span className="material-icons-round text-lg">auto_awesome</span>
            AI Builder
          </button>

          <button
            onClick={() => setShowExecution(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-colors"
          >
            <span className="material-icons-round text-lg">play_arrow</span>
            Test
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <WorkflowCanvas
          agent={agent}
          onUpdateAgent={onUpdateAgent}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          isConnecting={isConnecting}
          connectingFrom={connectingFrom}
          onStartConnection={handleStartConnection}
          onEndConnection={handleEndConnection}
        />

        {/* Editor Panel or AI Builder */}
        {showAIBuilder ? (
          <AIBuilderPanel
            agent={agent}
            onUpdateAgent={onUpdateAgent}
            onClose={onToggleAIBuilder}
          />
        ) : (
          <NodeEditorPanel
            node={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onSetAsEntry={handleSetAsEntry}
            allNodes={agent.nodes}
          />
        )}
      </div>

      {/* Execution Panel Overlay */}
      {showExecution && (
        <ExecutionPanel
          agent={agent}
          onClose={() => setShowExecution(false)}
        />
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AgentStudio: React.FC = () => {
  const [view, setView] = useState<StudioView>('gallery');
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [showAIBuilder, setShowAIBuilder] = useState(false);

  const handleSelectTemplate = (template: AgentTemplate) => {
    const newAgent: Agent = {
      ...createNewAgent(),
      name: template.agent.name,
      description: template.agent.description,
      nodes: template.agent.nodes,
      connections: template.agent.connections,
      entryNodeId: template.agent.entryNodeId
    };
    setCurrentAgent(newAgent);
    setView('designer');
  };

  const handleCreateFromScratch = () => {
    setCurrentAgent(createNewAgent());
    setView('designer');
    setShowAIBuilder(false);
  };

  const handleOpenAIBuilder = () => {
    setCurrentAgent(createNewAgent());
    setView('designer');
    setShowAIBuilder(true);
  };

  const handleBackToGallery = () => {
    setView('gallery');
    setCurrentAgent(null);
    setShowAIBuilder(false);
  };

  return (
    <div className="h-full w-full">
      {view === 'gallery' ? (
        <TemplatesGallery
          onSelectTemplate={handleSelectTemplate}
          onCreateFromScratch={handleCreateFromScratch}
          onOpenAIBuilder={handleOpenAIBuilder}
        />
      ) : currentAgent ? (
        <AgentDesigner
          agent={currentAgent}
          onUpdateAgent={setCurrentAgent}
          onBack={handleBackToGallery}
          showAIBuilder={showAIBuilder}
          onToggleAIBuilder={() => setShowAIBuilder(!showAIBuilder)}
        />
      ) : null}
    </div>
  );
};

export default AgentStudio;
