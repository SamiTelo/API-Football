import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as Sentry from '@sentry/node';
import WinstonTransport from 'winston-transport';
import util from 'node:util';

// Transport Sentry
interface LogInfo {
  level: string;
  message: string | Error;
  [key: string]: unknown;
}

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
      const level: Sentry.SeverityLevel = levelMap[info.level] || 'info';
      Sentry.addBreadcrumb({ message: String(info.message), level });
    }
    callback();
  }
}

@Injectable()
export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    const logFormat = winston.format.printf((info) => {
      const timestamp = new Date().toISOString(); // Toujours string, ESLint content
      const msg =
        info.message instanceof Error ? info.message.message : info.message;
      const stack = info.stack
        ? info.stack instanceof Error
          ? info.stack.stack
          : info.stack
        : '';
      return `[${timestamp}] ${info.level.toUpperCase()}: ${util.format(msg)}${stack ? `\n${util.format(stack)}` : ''}`;
    });

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
        new SentryWinstonTransport(),
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
  }

  debug(message: string) {
    this.logger.debug(message);
  }
}
