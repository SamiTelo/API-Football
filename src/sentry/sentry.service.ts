import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

@Injectable()
export class SentryService {
  constructor(private configService: ConfigService) {
    Sentry.init({
      dsn: this.configService.get<string>('SENTRY_DSN') || '', // DSN dynamique
      integrations: [nodeProfilingIntegration()], // Node Profiling
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  }
}
