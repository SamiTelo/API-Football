import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { SentryInterceptor } from './sentry/sentry.interceptor';
import * as dotenv from 'dotenv';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';

// Charge l'environnement correspondant
const env = process.env.NODE_ENV || 'development';

// Charge automatiquement
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: `.env.${env}` });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Création de l'application NestJS
  const server: Express = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // Trust proxy pour cookies sécurisés en prod
  server.set('trust proxy', 1);
  app.setGlobalPrefix('api');

  // Interceptor global Sentry
  app.useGlobalInterceptors(new SentryInterceptor());

  // Gestion des cookies
  app.use(cookieParser());

  // CORS (frontend)
  app.enableCors({
    origin: [
      'https://dashboard-football-club.vercel.app', // frontend déployé vercel
    ],
    credentials: true,
  });

  // Validation globale des DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API Club Football')
    .setVersion('1.0')
    .addTag('football')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token', // nom du security scheme
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

void bootstrap();
