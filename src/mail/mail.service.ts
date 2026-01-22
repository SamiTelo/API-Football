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
    const user = this.configService.get<string>('GMAIL_USER');
    const pass = this.configService.get<string>('GMAIL_APP_PASSWORD');
    this.from = this.configService.get<string>('MAIL_FROM')!;

    if (!user || !pass) {
      throw new Error('GMAIL_USER ou GMAIL_APP_PASSWORD non défini dans .env');
    }
    //  Configuration Gmail SMTP
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: { ciphers: 'SSLv3' },
    });

    this.logger.log(`Gmail SMTP initialized with user=${user}`);
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: `"MonApp" <${this.from}>`,
        to,
        subject,
        html,
      });
      //  Logging en dev
      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error) {
      this.logger.error('Error sending email', error);
      throw new InternalServerErrorException("Impossible d'envoyer l'email");
    }
  }
}
