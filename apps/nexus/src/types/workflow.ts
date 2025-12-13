export type NodeType = 'trigger' | 'condition' | 'action';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  title: string;
  icon?: string;
  params?: Record<string, any>;
  position: { x: number; y: number };
  connections?: string[]; // IDs of nodes this connects to
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'scheduled' | 'manual' | 'conditional' | 'event-based';
  status: 'active' | 'paused' | 'error' | 'draft';
  linkedSystems: string[];
  zones: string[];
  schedule?: string;
  nextRun?: string;
  lastRun?: string;
  successRate?: number;
  owner: {
    name: string;
    avatar?: string;
  };
  nodes: WorkflowNode[];
}
