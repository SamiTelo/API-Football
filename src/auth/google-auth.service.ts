import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';

@Injectable()
export class GoogleAuthService {
  private googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  /* -----------------------------------------------
   * LOGIN / REGISTER GOOGLE
  ------------------------------------------------ */
  async loginWithGoogle(idToken: string) {
    // Vérifier le token Google
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
    });

    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Token Google invalide');

    const { sub, email, given_name, family_name, email_verified } = payload;
    if (!email || !sub)
      throw new UnauthorizedException('Token Google invalide');

    // Chercher utilisateur existant
    let user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    // Si utilisateur n'existe pas → création auto
    if (!user) {
      const role = await this.prisma.role.findUnique({
        where: { name: 'USER' },
      });
      if (!role)
        throw new InternalServerErrorException('Rôle USER manquant en base');

      user = await this.prisma.user.create({
        data: {
          email,
          firstName: given_name ?? 'Utilisateur',
          lastName: family_name ?? 'Google',
          password: null,
          provider: 'google',
          providerId: sub,
          isVerified: email_verified ?? true,
          roleId: role.id,
        },
        include: { role: true },
      });
    }

    // Si email existe mais provider local → bloquer
    if (user.provider !== 'google') {
      throw new UnauthorizedException(
        'Ce compte utilise un mot de passe. Connectez-vous normalement.',
      );
    }

    // Génération access + refresh token
    const access_token = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role?.name ?? 'USER',
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: Number(this.configService.get('JWT_EXPIRATION')) || 3600,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn:
          Number(this.configService.get('JWT_REFRESH_EXPIRATION')) || 86400,
      },
    );

    // Hasher le refresh token pour sécurité
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      access_token,
      refreshToken,
    };
  }
}
