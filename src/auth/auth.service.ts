import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtService } from '@nestjs/jwt';
import { ForgotPasswordDto } from './dto/Password/forgot-password.dto';
import { ResetPasswordDto } from './dto/Password/reset-password.dto';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';

interface JwtRefreshPayload {
  sub: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly configService: ConfigService,
  ) {}

  /* -----------------------------------------------
   * UTILITAIRE : Génération générique de tokens
   ------------------------------------------------ */

  // Génération token
  private async generateToken(
    payload: object,
    secretEnv: string,
    expiresInSeconds: number, // <- uniquement number
  ): Promise<string> {
    const secret = this.configService.get<string>(secretEnv);
    if (!secret) throw new Error(`Missing JWT secret for ${secretEnv}`);

    return this.jwt.signAsync(payload, {
      secret,
      expiresIn: expiresInSeconds, // number accepter directement par Ts
    });
  }

  // Génération access token
  private async generateAccessToken(user: {
    id: number;
    email: string;
    role?: { id: number; name: string } | null; // accepte le rôle complet ou null
  }) {
    const expiresIn = Number(this.configService.get('JWT_EXPIRATION')) || 3600;

    // Prend le nom du rôle si présent, sinon fallback à undefined
    const roleName = user.role?.name;

    return this.generateToken(
      {
        sub: user.id,
        email: user.email,
        role: roleName, // ici c'est un string ou undefined
      },
      'JWT_SECRET',
      expiresIn,
    );
  }

  // Génération refresh token
  private async generateRefreshToken(user: { id: number }) {
    const expiresIn =
      Number(this.configService.get('JWT_REFRESH_EXPIRATION')) || 86400;
    return this.generateToken(
      {
        sub: user.id,
      },
      'JWT_REFRESH_SECRET',
      expiresIn,
    );
  }

  private getFrontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ??
      'https://mon-domaine.com'
    );
  }

  /* -----------------------------------------------
   * REGISTER USER (ROLE AUTO = USER)
   ------------------------------------------------ */
  async register(dto: CreateUserDto, ip: string) {
    const { firstName, lastName, email, password } = dto;

    const attempts = await this.prisma.signupAttempt.count({
      where: {
        ip,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (attempts >= 3) {
      throw new ConflictException(
        'Trop de comptes créés depuis cette IP. Réessayez demain.',
      );
    }

    await this.prisma.signupAttempt.create({ data: { ip } });

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Un utilisateur possède déjà cet email');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const role = await this.prisma.role.findUnique({
      where: { name: 'USER' },
    });

    if (!role) {
      throw new Error('Le rôle USER doit exister en base');
    }

    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        roleId: role.id,
        isVerified: false,
      },
    });

    const verifyToken = await this.generateToken(
      { sub: user.id },
      'JWT_VERIFY_SECRET',
      Number(this.configService.get('JWT_VERIFY_EXPIRATION')) || 86400,
    );

    const verifyLink = `${this.getFrontendUrl()}/verify-email?token=${verifyToken}`;

    await this.mail.sendMail(
      user.email,
      'Confirmez votre email',
      `<p>Bonjour ${user.firstName},</p>
       <p>Veuillez confirmer votre email :</p>
       <a href="${verifyLink}">${verifyLink}</a>`,
    );

    return {
      message: 'Compte créé. Vérifiez votre email pour l’activer.',
    };
  }

  /* -----------------------------------------------
   * LOGIN
   ------------------------------------------------ */
  async login(dto: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true }, // inclure le rôle
    });

    if (!user || !user.isVerified) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    const access_token = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: await bcrypt.hash(refreshToken, 10) },
    });

    //  Vérifier si 2FA est requis pour le rôle
    if (user.role?.name === 'ADMIN' || user.role?.name === 'SUPERADMIN') {
      // Générer code 2FA temporaire (6 chiffres)
      const twoFactorCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      const twoFactorExpiry = new Date(Date.now() + 5 * 60 * 1000); // expire dans 5 min

      // Sauvegarder le code et l'expiration en base
      await this.prisma.user.update({
        where: { id: user.id },
        data: { twoFactorCode, twoFactorExpiry },
      });

      // Envoyer le code par email
      await this.mail.sendMail(
        user.email,
        'Votre code 2FA',
        `<p>Bonjour ${user.firstName},</p>
       <p>Voici votre code 2FA : <strong>${twoFactorCode}</strong></p>
       <p>Il expire dans 5 minutes.</p>`,
      );

      // Retourner seulement le flag 2FA requis, pas encore les tokens finaux
      return {
        twoFactorRequired: true,
        userId: user.id, // pour identifier l'utilisateur côté frontend
      };
    }

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

  /* -----------------------------------------------
   * VERIFY EMAIL
   ------------------------------------------------ */
  async verifyEmail(token: string) {
    const payload = this.jwt.verify<{ sub: number }>(token, {
      secret: this.configService.get('JWT_VERIFY_SECRET'),
    });

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { isVerified: true },
    });

    return { message: 'Email vérifié avec succès' };
  }

  /* -----------------------------------------------
   * VERIFY 2FA
   ------------------------------------------------ */
  async verify2fa(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorCode || !user.twoFactorExpiry)
      throw new UnauthorizedException();

    if (user.twoFactorExpiry < new Date())
      throw new UnauthorizedException('Code expiré');

    const valid = await bcrypt.compare(code, user.twoFactorCode);
    if (!valid) throw new UnauthorizedException('Code invalide');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: null,
        twoFactorExpiry: null,
      },
    });

    return {
      access_token: await this.generateAccessToken(user),
      refreshToken: await this.generateRefreshToken(user),
    };
  }

  // -----------------------------------------------
  // CREATE ADMIN (avec audit IP et utilisateur créateur)
  // -----------------------------------------------
  async createAdmin(dto: CreateUserDto, ip: string, creatorEmail?: string) {
    const initiator = creatorEmail ?? 'inconnu';

    //  Audit tentative
    this.logger.warn(
      `Tentative création ADMIN | Email: ${dto.email} | IP: ${ip} | Par: ${initiator}`,
    );

    //  Vérification doublon email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      this.logger.warn(
        `ÉCHEC création ADMIN | Email déjà existant: ${dto.email} | IP: ${ip}`,
      );
      throw new BadRequestException(
        'Un utilisateur avec cet email existe déjà',
      );
    }

    //  Rôle ADMIN
    const role = await this.prisma.role.findUnique({
      where: { name: 'ADMIN' },
    });

    if (!role) {
      this.logger.error('Rôle ADMIN introuvable en base');
      throw new InternalServerErrorException(
        'Configuration invalide : rôle ADMIN manquant',
      );
    }

    //  Hash mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    //  Création admin
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashedPassword,
        roleId: role.id,
        isVerified: true,
      },
    });

    //  Log succès
    this.logger.log(
      `ADMIN créé | ID: ${user.id} | Email: ${user.email} | IP: ${ip} | Par: ${initiator}`,
    );

    return {
      message: 'Administrateur créé avec succès',
      userId: user.id,
    };
  }

  /* -----------------------------------------------
   * PROFILE / VALIDATION
   ------------------------------------------------ */
  async validateUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException('Utilisateur invalide');
    return user;
  }

  /* -----------------------------------------------
   * REFRESH TOKEN
   ------------------------------------------------ */
  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true },
      });
      if (!user) throw new UnauthorizedException('Utilisateur invalide');

      const access_token = await this.generateAccessToken(user);
      return { access_token };
    } catch (error) {
      this.logger.error('Erreur refresh token', error);
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  /* -----------------------------------------------
   * REFRESH ACCESS TOKEN + NEW REFRESH TOKEN
   ------------------------------------------------ */
  async refreshAccessTokenAndUpdateToken(oldRefreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtRefreshPayload>(oldRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || !user.refreshToken)
        throw new UnauthorizedException('Utilisateur invalide');

      const isTokenValid = await bcrypt.compare(
        oldRefreshToken,
        user.refreshToken,
      );
      if (!isTokenValid)
        throw new UnauthorizedException('Refresh token invalide');

      const access_token = await this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user);
      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
      });

      return { access_token, refreshToken: newRefreshToken };
    } catch (error) {
      this.logger.error('Erreur refresh token', error);
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  /* -----------------------------------------------
   * LOGOUT
   ------------------------------------------------ */
  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  /* -----------------------------------------------
   * FORGOT PASSWORD
   ------------------------------------------------ */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    const resetToken = await this.generateToken(
      { sub: user.id },
      'JWT_RESET_SECRET',
      Number(this.configService.get('JWT_RESET_EXPIRATION')) || 900,
    );

    const resetLink = `${this.getFrontendUrl()}/reset-password?token=${resetToken}`;

    await this.mail.sendMail(
      user.email,
      'Réinitialisation du mot de passe',
      `<p>Bonjour ${user.firstName} ${user.lastName}</p>
       <p>Voici votre lien de réinitialisation :</p>
       <a href="${resetLink}">${resetLink}</a>
       <p>Le lien expire dans 15 minutes.</p>`,
    );

    return { message: 'Un lien de réinitialisation vous a été envoyé.' };
  }

  /* -----------------------------------------------
   * RESET PASSWORD
   ------------------------------------------------ */
  async resetPassword(dto: ResetPasswordDto) {
    try {
      const payload = this.jwt.verify<{ sub: number }>(dto.token, {
        secret: this.configService.get('JWT_RESET_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) throw new UnauthorizedException('Utilisateur non trouvé');

      const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return { message: 'Mot de passe réinitialisé avec succès' };
    } catch (error) {
      this.logger.error('Erreur reset password', error);
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}
