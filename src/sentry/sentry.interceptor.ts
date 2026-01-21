import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err: unknown) => {
        // Envoi l'erreur à Sentry
        Sentry.captureException(err);

        // Retourne l'erreur pour que NestJS la gère normalement
        return throwError(() => err);
      }),
    );
  }
}
