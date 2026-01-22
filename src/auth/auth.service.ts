import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
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

  // Génération générique de token
  private async generateToken(
    payload: object,
    secretEnv: string,
    expiresInSeconds: number, // <- uniquement number
  ): Promise<string> {
    const secret = this.configService.get<string>(secretEnv);
    if (!secret) throw new Error(`Missing JWT secret for ${secretEnv}`);

    return this.jwt.signAsync(payload, {
      secret,
      expiresIn: expiresInSeconds, // TypeScript accepte directement number
    });
  }

  // Génération access token
  private async generateAccessToken(user: {
    id: number;
    email: string;
    role?: string;
  }) {
    const expiresIn = Number(this.configService.get('JWT_EXPIRATION')) || 3600;

    // Récupère le rôle depuis la base si nécessaire
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true },
    });

    return this.generateToken(
      {
        sub: user.id,
        email: user.email,
        role: dbUser?.role?.name, // <-- ajoute le rôle ici
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

  // -----------------------------------------------
  // CREATE ADMIN (avec audit IP)
  // -----------------------------------------------
  async createAdmin(dto: CreateUserDto, ip: string) {
    // Audit / traçabilité
    this.logger.warn(
      `Tentative de création ADMIN depuis IP: ${ip} | Email: ${dto.email}`,
    );

    const role = await this.prisma.role.findUnique({
      where: { name: 'ADMIN' },
    });

    if (!role) {
      this.logger.error('Rôle ADMIN introuvable en base');
      throw new Error('Le rôle ADMIN doit exister');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: hashedPassword,
        roleId: role.id,
        isVerified: true, // admin activé directement
      },
    });

    //  Log succès
    this.logger.log(`ADMIN créé avec succès | ID: ${user.id} | IP: ${ip}`);

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
