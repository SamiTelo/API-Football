import { Injectable, ExecutionContext } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerStorage,
  ThrottlerLimitDetail,
  ThrottlerException,
} from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import { LoggerService } from '../logger/logger.service';
import { Counter } from 'prom-client';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

// Compteur Prometheus pour les dépassements du rate limiter
const rateLimitCounter = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Nombre de dépassements du rate limiter',
  labelNames: ['ip', 'route'],
});

@Injectable()
export class LoggingThrottlerGuard extends ThrottlerGuard {
  constructor(
    private readonly logger: LoggerService,
    options: ThrottlerModuleOptions,
    storage: ThrottlerStorage,
    reflector: Reflector,
  ) {
    // Passe les options globales et les services au ThrottlerGuard parent
    super(options, storage, reflector);
  }

  /**
   * Override de la méthode qui lance l'exception en cas de dépassement
   * pour ajouter le logging et le compteur Prometheus
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    // Nécessaire pour respecter la signature async de la méthode parent et satisfaire ESLint
    await Promise.resolve();

    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip;
    const path = req.url;

    // Logging côté serveur
    this.logger.warn(
      `Dépassement du rate limit pour IP ${ip} sur la route ${path}. Limite : ${throttlerLimitDetail.limit} requêtes/${throttlerLimitDetail.ttl}s`,
    );

    // Monitoring : incrémenter le compteur Prometheus
    rateLimitCounter.inc({ ip, route: path });

    // Retour au client : HTTP 429
    throw new ThrottlerException('Trop de requêtes');
  }
}
