import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { PositionModule } from './position/position.module';
import { TeamModule } from './team/team.module';
import { PlayerModule } from './player/player.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import {
  ThrottlerModule,
  ThrottlerStorage,
  ThrottlerModuleOptions,
} from '@nestjs/throttler';
import { LoggerModule } from './logger/logger.module';
import { LoggerService } from './logger/logger.service';
import { LoggingThrottlerGuard } from './guards/logging-throttler.guard';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { SentryTracingModule } from './sentry/sentry-tracing.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    // validation global de mes env au demarrage
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: envValidationSchema as unknown as Record<string, any>,
    }),

    // Expose /metrics automatiquement
    PrometheusModule.register(),

    // Limite globale : 100 requêtes / 15 minutes
    ThrottlerModule.forRoot({
      // @ts-expect-error: TS ne reconnaît pas les propriétés ttl/limit sur ThrottlerModuleOptions
      ttl: Number(process.env.THROTTLE_TTL || 900),
      limit: Number(process.env.THROTTLE_LIMIT || 100),
    }),

    MailModule,
    LoggerModule, //  global
    PrismaModule, // global
    PositionModule,
    TeamModule,
    UploadModule,
    PlayerModule,
    AuthModule,
    SentryTracingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (
        logger: LoggerService,
        storage: ThrottlerStorage,
        reflector: Reflector,
      ) => {
        const options: ThrottlerModuleOptions = {
          // @ts-expect-error: TS ne reconnaît pas les propriétés ttl/limit sur ThrottlerModuleOptions
          ttl: Number(process.env.THROTTLE_TTL || 900),
          limit: Number(process.env.THROTTLE_LIMIT || 100),
          throttlers: [],
        };
        return new LoggingThrottlerGuard(logger, options, storage, reflector);
      },
      inject: [LoggerService, ThrottlerStorage, Reflector],
    },
  ],
})
export class AppModule {}
