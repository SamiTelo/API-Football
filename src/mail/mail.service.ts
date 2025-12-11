import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY')!;
    this.from = this.configService.get<string>('MAIL_FROM')!;

    sgMail.setApiKey(apiKey);

    // 🔹 Log conditionné par NODE_ENV
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`SendGrid initialized with from=${this.from}`);
    } else {
      // Optionnel : tu peux loguer en prod si tu veux (audit), sinon supprimer
      this.logger.log(`SendGrid initialized`);
    }
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      await sgMail.send({
        to,
        from: this.from,
        subject,
        html,
      });

      // 🔹 Logging email uniquement en dev
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`Email sent to ${to} with subject "${subject}"`);
      }
    } catch (error) {
      this.logger.error('Error sending email', error);
      throw new InternalServerErrorException("Impossible d'envoyer l'email");
    }
  }
}
