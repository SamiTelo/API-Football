import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule], // pour utiliser ConfigService dans MailService
  providers: [MailService],
  exports: [MailService], // exporte pour pouvoir l'utiliser dans d'autres modules
})
export class MailModule {}
