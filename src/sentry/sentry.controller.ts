import { Controller, Get } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service'; // ajuste le chemin si besoin

@Controller('sentry')
export class SentryController {
  constructor(private readonly logger: LoggerService) {} // Injection du service

  // Route de test uniquement en dev
  @Get('test-error')
  testError() {
    // Envoie une erreur volontaire
    const error = new Error('Test Sentry via LoggerService');
    this.logger.error(error);
    return { message: 'Erreur envoyée à Sentry' };
  }

  @Get('test-info')
  testInfo() {
    this.logger.info('Test info log vers Sentry');
    return { message: 'Info envoyée à Sentry (breadcrumb)' };
  }
}
