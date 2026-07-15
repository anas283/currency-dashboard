import { EnvironmentConfig } from '../app/core/tokens/env.token';

export const environment: EnvironmentConfig = {
  apiBase: 'https://v6.exchangerate-api.com/v6',
  apiKey: '',
  pollInterval: 60_000,
  staleThreshold: 300_000,
};
