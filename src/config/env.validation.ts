import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('3600'),

  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('24h'),

  JWT_RESET_SECRET: Joi.string().required(),
  JWT_RESET_EXPIRATION: Joi.string().default('900'),

  MAIL_HOST: Joi.string().required(),
  MAIL_PORT: Joi.number().required(),
  MAIL_SECURE: Joi.boolean().truthy('true').falsy('false').required(),
  MAIL_USER: Joi.string().required(),
  MAIL_PASSWORD: Joi.string().required(),
  MAIL_FROM: Joi.string().email().required(),

  // FRONTEND_URL pour les liens dans les e-mails
  FRONTEND_URL: Joi.string().uri().required(),

  PORT: Joi.number().default(3001),

  SENTRY_DSN: Joi.string().uri().required(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
});
