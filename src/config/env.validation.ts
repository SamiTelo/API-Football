import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('3600'),

  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('24h'),

  JWT_RESET_SECRET: Joi.string().required(),
  JWT_RESET_EXPIRATION: Joi.string().default('900'),

  SENDGRID_API_KEY: Joi.string().required(),
  MAIL_FROM: Joi.string().email().required(),

  PORT: Joi.number().default(3001),

  SENTRY_DSN: Joi.string().uri().required(),
});
