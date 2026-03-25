import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { ConfigModule } from '@nestjs/config';
import { SentryService } from './sentry.service';
import { SentryInterceptor } from './sentry.interceptor';

@Module({
  imports: [
    ConfigModule, // Pour SentryService
    SentryModule.forRoot(), // Objet vide, SentryService gère l'init
  ],
  controllers: [],
  providers: [
    SentryService,
    SentryInterceptor, // <-- ajoute de SentryInterceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: SentryInterceptor, // Capture toutes les erreurs globalement
    },
  ],
  exports: [SentryModule, SentryService],
})
export class SentryTracingModule {}
