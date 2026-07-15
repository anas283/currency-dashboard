export interface LatestResponse {
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_unix: number;
  time_next_update_unix: number;
}

export interface PairResponse {
  base_code: string;
  target_code: string;
  conversion_rate: number;
  conversion_result: number;
}

export interface HistoryResponse {
  base_code: string;
  year: number;
  month: number;
  day: number;
  conversion_rates: Record<string, number>;
}

export interface ApiError {
  error: true;
  errorType: string;
  message: string;
}
