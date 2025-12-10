export interface GradingResult {
  lineNumber: number;
  latex: string;
  isCorrect: boolean;
  explanation: string;
  // Gemini returns [ymin, xmin, ymax, xmax] in 0-1000 scale
  boundingBox: [number, number, number, number];
}

export interface ApiResponse {
  results?: GradingResult[];
  error?: string;
}
