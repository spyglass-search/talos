export interface ApiResponse<T> {
  time: number;
  status: string;
  result: T;
}

export interface ApiError {
  status: string;
  error: string;
}

export interface TaskResponse<T> {
  uuid: string;
  status: string;
  result?: T;
  error?: string;
  operations_complete: number;
  operation_count?: number;
  finished_on?: string;
}

export interface SummaryResponse {
  paragraph: string;
  bullets: string;
}

export interface ParseResponse {
  parsed: string;
}
