import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('3600'),

  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('24h'),

  JWT_RESET_SECRET: Joi.string().required(),
  JWT_RESET_EXPIRATION: Joi.string().default('900'),

  MAIL_FROM: Joi.string().email().required(),

  //  Ajout pour Gmail SMTP
  GMAIL_USER: Joi.string().email().required(),
  GMAIL_APP_PASSWORD: Joi.string().required(),

  // FRONTEND_URL pour les liens dans les e-mails
  FRONTEND_URL: Joi.string().uri().required(),

  PORT: Joi.number().default(3001),

  SENTRY_DSN: Joi.string().uri().required(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
});
