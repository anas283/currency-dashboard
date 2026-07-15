import { environment as devEnvironment } from './environment';
import { environment as prodEnvironment } from './environment.prod';
import { EnvironmentConfig } from '../app/core/tokens/env.token';

function isEnvironmentConfig(value: unknown): value is EnvironmentConfig {
  const candidate = value as Partial<EnvironmentConfig>;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.apiBase === 'string' &&
    typeof candidate.apiKey === 'string' &&
    typeof candidate.pollInterval === 'number' &&
    typeof candidate.staleThreshold === 'number'
  );
}

describe('environments', () => {
  it('dev environment should match the environment config shape', () => {
    expect(isEnvironmentConfig(devEnvironment)).toBeTrue();
  });

  it('prod environment should match the environment config shape', () => {
    expect(isEnvironmentConfig(prodEnvironment)).toBeTrue();
  });
});
