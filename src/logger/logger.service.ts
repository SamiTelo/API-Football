// src/logger/logger.service.ts
import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as Sentry from '@sentry/node';
import WinstonTransport from 'winston-transport';

// Transport Winston pour envoyer automatiquement les logs vers Sentry
interface LogInfo {
  level: string;
  message: string | Error;
  [key: string]: unknown;
}

// Mapping des niveaux Winston vers Sentry
const levelMap: Record<string, Sentry.SeverityLevel> = {
  error: 'error',
  warn: 'warning',
  info: 'info',
  debug: 'debug',
};

export class SentryWinstonTransport extends WinstonTransport {
  log(info: LogInfo, callback: () => void) {
    setImmediate(() => this.emit('logged', info));

    if (info.level === 'error') {
      const err =
        info.message instanceof Error
          ? info.message
          : new Error(String(info.message));
      Sentry.captureException(err);
    } else {
      // Mapping sûr du niveau
      const level: Sentry.SeverityLevel = levelMap[info.level] || 'info';
      Sentry.addBreadcrumb({
        message: String(info.message),
        level,
      });
    }

    callback();
  }
}

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    const logFormat = winston.format.printf(
      (info: {
        level: string;
        message: string;
        timestamp: string;
        stack?: string;
      }) =>
        `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}${info.stack ? `\n${info.stack}` : ''}`,
    );

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        logFormat,
      ),
      transports: [
        new winston.transports.Console(),

        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          level: 'error',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
        }),

        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
        }),

        new SentryWinstonTransport(), // <-- Intégration Sentry
      ],
    });
  }

  info(message: string) {
    this.logger.info(message);
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  error(message: string | Error) {
    this.logger.error(message);
    // Optionnel si je veux double assurance
    // Sentry.captureException(message instanceof Error ? message : new Error(message));
  }

  debug(message: string) {
    this.logger.debug(message);
  }
}
