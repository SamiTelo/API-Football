import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrometheusService } from './prometheus.service';
import { Request, Response } from 'express';

@Injectable()
export class PrometheusInterceptor implements NestInterceptor {
  constructor(private readonly prometheus: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        const method = request.method;
        // Cast request.route en objet avec path comme string
        const route: string = String(
          (request.route as { path: string } | undefined)?.path ??
            request.url ??
            'unknown_route',
        );
        const status = response.statusCode;

        // Counter
        this.prometheus.httpCounter.inc({ method, route, status });

        // Duration
        const duration = (Date.now() - now) / 1000;
        this.prometheus.httpDuration.observe(
          {
            method,
            route,
            status,
          },
          duration,
        );
      }),
    );
  }
}
