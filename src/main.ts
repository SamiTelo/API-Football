import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { SentryInterceptor } from './sentry/sentry.interceptor';
import * as dotenv from 'dotenv';

// Charge l'environnement correspondant
const env = process.env.NODE_ENV || 'development';

// Charge automatiquement le bon fichier : .env.development ou .env.production
dotenv.config({ path: `.env.${env}` });

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Création de l'application NestJS
  const app = await NestFactory.create(AppModule);

  // Interceptor global Sentry
  app.useGlobalInterceptors(app.get(SentryInterceptor));

  // Gestion des cookies
  app.use(cookieParser());

  // CORS (frontend)
  app.enableCors({
    origin: 'http://localhost:3000', // changer selon ton frontend
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
        type: 'http', // obligatoire, standard OpenAPI
        scheme: 'bearer', // « Authorization: Bearer <token> »
        bearerFormat: 'JWT', // optionnel mais clair pour Swagger
      },
      'access-token', // nom du security scheme → important si tu as plusieurs guards
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

void bootstrap();
