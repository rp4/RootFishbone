
export enum NodeType {
  PROBLEM = 'PROBLEM',
  CATEGORY = 'CATEGORY',
  SPINE = 'SPINE' // Structural nodes for the fishbone spine
}

export interface Evidence {
  id: string;
  name: string; // e.g., "Log ID 123", "Policy Doc"
  description?: string;
}

export interface Cause {
  id: string;
  name: string; // The contributing factor
  description?: string;
  evidence: Evidence[]; // Supporting artifacts
}

export interface ProcessNodeData {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  causes: Cause[]; // Renamed from risks
  // Updated to accept partial data update
  onEdit?: (id: string, data: Partial<ProcessNodeData>) => void;
}

export interface EdgeData {
  label?: string;
  causes?: Cause[];
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model'
}

export enum ContentType {
  TEXT = 'text',
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string; // Text content
  type: ContentType;
  timestamp: number;
  attachedFileName?: string;
}

export interface SimulationResult {
  bin: string;
  frequency: number;
}
