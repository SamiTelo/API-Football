import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = Number(this.configService.get<string>('MAIL_PORT'));
    const secure = this.configService.get<string>('MAIL_SECURE') === 'true';
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');
    const from = this.configService.get<string>('MAIL_FROM');

    if (!host || !port || !user || !pass || !from) {
      throw new Error('SMTP configuration is missing in environment variables');
    }

    this.from = from;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    this.logger.log(`SMTP initialized with host=${host} and user=${user}`);
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: `"Football Club" <${this.from}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error) {
      this.logger.error('Error sending email', error);
      throw new InternalServerErrorException("Impossible d'envoyer l'email");
    }
  }
}
