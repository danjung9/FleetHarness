import type { NewProject } from './types.js';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  createdAt: string;
  runId?: string;
  phase?: 'research' | 'plan';
  status?: 'streaming' | 'complete' | 'error';
}

export type ClarificationAnswerType = 'text' | 'single_choice' | 'multiple_choice';

export interface ClarificationAnswer {
  selectedOptions: string[];
  text: string;
}

export interface ClarificationQuestion {
  id: string;
  round?: number;
  runId: string;
  phase: 'research' | 'plan';
  question: string;
  context: string;
  /** Omitted in older saved questions; infer single_choice when options exist, otherwise text. */
  answerType?: ClarificationAnswerType;
  options?: string[];
  recommendation?: string;
  status: 'pending' | 'answered' | 'cancelled';
  answer?: string;
  response?: ClarificationAnswer;
  createdAt: string;
}

export interface ConversationAction {
  id: string;
  type: 'start' | 'stop' | 'revise';
  title: string;
  reason: string;
  status: 'proposed' | 'applied' | 'dismissed';
  brief?: NewProject;
  baseBriefHash: string;
  runId?: string;
}

export interface ProjectConversation {
  messages: ConversationMessage[];
  questions: ClarificationQuestion[];
  actions: ConversationAction[];
  status: 'idle' | 'responding';
  error?: string;
}

export const emptyConversation = (): ProjectConversation => ({ messages: [], questions: [], actions: [], status: 'idle' });
