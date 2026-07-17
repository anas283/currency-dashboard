import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';
import { ENV_TOKEN, EnvironmentConfig } from './app/core/tokens/env.token';

const providers = [...appConfig.providers];
const cypressEnv = (window as unknown as { __CYPRESS_ENV__?: EnvironmentConfig }).__CYPRESS_ENV__;
if (cypressEnv) {
  providers.push({ provide: ENV_TOKEN, useValue: cypressEnv as EnvironmentConfig });
}

bootstrapApplication(App, { providers }).catch((err) => console.error(err));
