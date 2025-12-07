export interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Project {
  id: string;
  name: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Blocked';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  owner: string;
  budget: number;
  startDate: string; // New field for real timeline
  dueDate: string;
  description: string;
  comments: Comment[];
  subtasks: SubTask[];
}

export type SortField = keyof Project;
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'list' | 'board';

export interface DashboardStats {
  totalProjects: number;
  totalBudget: number;
  activeProjects: number;
  criticalProjects: number;
}