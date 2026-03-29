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
  private readonly apiKey: string;
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
    this.apiKey = apiKey;

    // Log pour production : juste l'info que le service est initialisé
    this.logger.log(`MailService initialized with sender=${this.from}`);
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender: {
            email: this.from,
            name: 'Football-club',
          },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );

      this.logger.log(`Email sent to ${to} with subject "${subject}"`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error('Error sending email via Brevo API', message);
      throw new InternalServerErrorException("Impossible d'envoyer l'email");
    }
  }
}
