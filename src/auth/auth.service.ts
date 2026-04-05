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
    expiresInSeconds: number,
  ): Promise<string> {
    const secret = this.configService.get<string>(secretEnv);
    if (!secret) throw new Error(`Missing JWT secret for ${secretEnv}`);

    return this.jwt.signAsync(payload, {
      secret,
      expiresIn: expiresInSeconds,
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
        role: roleName,
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

    const verifyLink = `${this.getFrontendUrl()}/auth/verify-email?token=${verifyToken}`;

    await this.mail.sendMail(
      user.email,
      'Confirmez votre email',
      `<p>Bonjour ${user.firstName},</p>
       <p>Veuillez confirmer votre email en cliquant sur le lien ci-dessous :</p>
       <a href="${verifyLink}">${verifyLink}</a>
       <p><span style="color: red; font-weight: bold;">Attention ! </span> Ce lien expirera dans 24 heures.</p>
       <p>Si vous n’avez pas créé ce compte, ignorez ce mail.</p>`,
    );

    return {
      message: 'Compte créé. Vérifiez votre email pour l’activer.',
    };
  }

  /* -----------------------------------------------
   * VERIFY EMAIL
   ------------------------------------------------ */
  async verifyEmail(token: string) {
    // Vérifie et décode le token
    const payload = this.jwt.verify<{ sub: number }>(token, {
      secret: this.configService.getOrThrow<string>('JWT_VERIFY_SECRET'),
    });

    // Récupère l'utilisateur
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true }, // inclure le rôle pour vérifier role.name
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    // Vérifie si c'est un utilisateur classique
    if (user.role?.name !== 'USER') {
      throw new UnauthorizedException(
        'Cette opération est réservée aux utilisateurs classiques',
      );
    }

    // Marque l'utilisateur comme vérifié
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    // Génère les tokens en utilisant la fonction utilitaire existante
    const access_token = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Retourne uniquement les infos nécessaires + tokens
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

  /* ---------------------------------------------------------------------
  /* RESEND VERIFICATION EMAIL (avec contrôle de délai entre renvois)
   ---------------------------------------------------------------- */
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.isVerified)
      throw new BadRequestException('Le compte est déjà vérifié');
    if (user.role?.name !== 'USER')
      throw new BadRequestException(
        'Cette opération est réservée aux utilisateurs classiques',
      );

    // Vérifier délai entre renvois (10 min)
    const now = new Date();
    if (user.lastVerificationSentAt) {
      const diff =
        (now.getTime() - user.lastVerificationSentAt.getTime()) / 1000;
      if (diff < 10 * 60) {
        throw new BadRequestException(
          `Vous devez attendre ${Math.ceil((10 * 60 - diff) / 60)} minutes avant de renvoyer un nouveau lien`,
        );
      }
    }

    // Générer nouveau token et lien
    const verifyToken = await this.generateToken(
      { sub: user.id },
      'JWT_VERIFY_SECRET',
      Number(this.configService.get('JWT_VERIFY_EXPIRATION')) || 86400,
    );
    const verifyLink = `${this.getFrontendUrl()}/auth/verify-email?token=${verifyToken}`;

    // Envoyer le mail
    await this.mail.sendMail(
      user.email,
      'Confirmez votre email',
      `<p>Bonjour ${user.firstName},</p>
     <p>Veuillez confirmer votre email en cliquant sur le lien ci-dessous :</p>
     <a href="${verifyLink}">${verifyLink}</a>
     <p><span style="color: red; font-weight: bold;">Attention ! </span> Ce lien expirera dans 24 heures.</p>
     <p>Si vous n’avez pas créé ce compte, ignorez ce mail.</p>`,
    );

    // Mettre à jour lastVerificationSentAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastVerificationSentAt: now },
    });

    return { message: 'Un nouveau lien de vérification vous a été envoyé.' };
  }

  /* -----------------------------------------------
  *   LOGIN
  ------------------------------------------------ */
  async login(dto: LoginUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    if (!user || !user.isVerified) {
      throw new UnauthorizedException(
        'Impossible de se connecter. Veuillez verifier votre email pour activer votre compte',
      );
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException(
        "Identifiants invalides. Veuillez reinitialiser votre mot de passe si vous l'avez oublié",
      );
    }

    // 2FA pour ADMIN / SUPERADMIN
    if (user.role?.name === 'ADMIN' || user.role?.name === 'SUPERADMIN') {
      const twoFactorCode = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      const hashedTwoFactorCode = await bcrypt.hash(twoFactorCode, 10);
      const twoFactorExpiry = new Date(Date.now() + 5 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorCode: hashedTwoFactorCode,
          twoFactorExpiry,
        },
      });

      await this.mail.sendMail(
        user.email,
        'Votre code 2FA',
        `<p>Bonjour ${user.firstName},</p>
       <p>Voici votre code <strong>${twoFactorCode}</strong>, Veuillez saisir et valider ce code pour vous connecter</p>
       <p><span style="color: red; font-weight: bold;">Attention ! </span> Il expire dans 5 minutes.</p>
       <p>Si vous n'avez pas tenter de vous connecter, ignorez ce mail.</p>`,
      );

      return {
        requires2FA: true,
        userId: user.id,
      };
    }

    // USER normal
    const access_token = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

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

  /* -----------------------------------------------
 * VERIFY 2FA
 ------------------------------------------------ */
  async verify2fa(userId: number, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorCode || !user.twoFactorExpiry) {
      throw new UnauthorizedException();
    }

    if (user.twoFactorExpiry < new Date()) {
      throw new UnauthorizedException('Code expiré');
    }

    const valid = await bcrypt.compare(code, user.twoFactorCode);

    if (!valid) {
      throw new UnauthorizedException('Code invalide');
    }

    // Générer nouveaux tokens
    const access_token = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // Hasher le refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: null,
        twoFactorExpiry: null,
        refreshToken: hashedRefreshToken,
      },
    });

    return {
      access_token,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
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

    const resetLink = `${this.getFrontendUrl()}/auth/reset-password?token=${resetToken}`;

    await this.mail.sendMail(
      user.email,
      'Réinitialisation du mot de passe',
      `<p>Bonjour ${user.firstName} ${user.lastName}</p>
       <p>Voici votre lien de réinitialisation :</p>
       <a href="${resetLink}">${resetLink}</a>
       <p><span style="color: red; font-weight: bold;">Attention ! </span> Ce lien expirera dans 15 minutes.</p>
       <p>Si vous n’avez pas créé ce compte, ignorez ce mail.</p>`,
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
