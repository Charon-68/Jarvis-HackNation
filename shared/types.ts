// Shared TypeScript types across frontend and agents

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface AgentResponse {
  ticketId: string;
  analysis: string;
  suggestedActions: string[];
  confidence: number;
}
