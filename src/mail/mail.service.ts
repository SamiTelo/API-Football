import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MailService {
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const from = this.configService.get<string>('MAIL_FROM');
    const apiKey = this.configService.get<string>('MAIL_BREVO_API_KEY');

    if (!from || !apiKey) {
      throw new Error(
        'Brevo API configuration is missing in environment variables',
      );
    }

    this.from = from;
    this.logger.log(`MailService initialized with sender=${this.from}`);
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: { email: this.from },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        },
        {
          headers: {
            'api-key': this.configService.get<string>('BREVO_API_KEY'),
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error) {
      this.logger.error('Error sending email via Brevo API', error);
      throw new InternalServerErrorException("Impossible d'envoyer l'email");
    }
  }
}
