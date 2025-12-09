export enum GradingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface Annotation {
  type: 'correct' | 'error' | 'warning' | 'info';
  x: number; // 0 to 1 relative coordinate
  y: number; // 0 to 1 relative coordinate
  width?: number; // 0 to 1 for boxes
  height?: number; // 0 to 1 for boxes
  text?: string;
}

export interface GradingResult {
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  annotations: Annotation[];
  // New fields for accuracy and image gen
  studentTranscription?: string; // To ensure AI read it correctly
  conceptDescription?: string; // Prompt for the image generator
  visualAidUrl?: string; // Resulting image URL
}

export interface StudentSubmission {
  id: string;
  name: string;
  file: File;
  previewUrl: string;
  status: GradingStatus;
  result?: GradingResult;
  error?: string;
}

export interface BatchStats {
  total: number;
  graded: number;
  averageScore: number;
  passRate: number;
}