import { InjectionToken } from '@angular/core';

export interface EnvironmentConfig {
  apiBase: string;
  apiKey: string;
  pollInterval: number;
  staleThreshold: number;
}

export const ENV_TOKEN = new InjectionToken<EnvironmentConfig>('ENV_TOKEN');
