/**
 * Community Types
 */

export type CommentRelevance = 'on_topic' | 'loosely_related' | 'off_topic';
export type CommentTone = 'positive' | 'neutral' | 'negative' | 'aggressive';
export type CommentConstructiveness = 'constructive' | 'low_value' | 'disruptive';
export type TopicSentiment = 'positive' | 'neutral' | 'negative' | 'mixed';
export type TopicQuality = 'low' | 'medium' | 'high';

export interface Topic {
  id: string;
  creator_id: string;
  starter_text: string;
  starter_media_url?: string;
  created_at: string;
  last_comment_id?: string;
  last_comment_at?: string;
  comment_count?: number;
}

export interface Comment {
  id: string;
  topic_id: string;
  author_id: string;
  text: string;
  created_at: string;
}

export interface CommentAnalysis {
  comment_id: string;
  topic_id: string;
  author_id: string;
  relevance: CommentRelevance;
  tone: CommentTone;
  constructiveness: CommentConstructiveness;
  short_reason?: string;
  model_version: string;
  created_at: string;
}

export interface CommentWithAnalysis extends Comment {
  analysis?: CommentAnalysis;
}

export interface TopicMetrics {
  comment_count: number;
  unique_participants: number;
  comments_last_hour: number;
  comments_last_24h: number;
  time_to_first_reply_mins?: number;
}

export interface TopicAISummary {
  sentiment: TopicSentiment;
  quality: TopicQuality;
  focus_score: number; // 0-1
}

export interface TopicAnalysisSnapshot {
  topic_id: string;
  computed_at: string;
  based_on_last_comment_id?: string;
  metrics: TopicMetrics;
  ai_summary: TopicAISummary;
  model_version: string;
}

export interface UserLabel {
  key: string;
  score: number; // 0-100
  description: string;
  evidence_comment_ids: string[];
}

export interface UserProfileSnapshot {
  user_id: string;
  computed_at: string;
  based_on_last_analyzed_comment_id?: string;
  labels: UserLabel[];
  model_version: string;
}
