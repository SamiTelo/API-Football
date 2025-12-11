import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
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
import { SignupAttempt } from '@prisma/client';

interface JwtRefreshPayload {
  sub: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly configService: ConfigService,
  ) {}

  /* -----------------------------------------------
   * UTILITAIRES : Génération des tokens
   ------------------------------------------------ */
  private async generateAccessToken(user: { id: number; email: string }) {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: Number(this.configService.get('JWT_EXPIRATION')) || 3600,
      },
    );
  }

  private async generateRefreshToken(user: { id: number }) {
    return this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: 24 * 3600, // 24h
      },
    );
  }

  /* -----------------------------------------------
 * REGISTER
 ------------------------------------------------ */
  async register(createUserDto: CreateUserDto, ip: string) {
    const { firstName, lastName, email, password } = createUserDto;

    /* -----------------------------
   * 1) Détection création admin
   ------------------------------ */
    const isAdminCreation = createUserDto.role === 'ADMIN';

    /* ---------------------------------------------------------
   * 2) Limite IP = uniquement pour les utilisateurs normaux
   --------------------------------------------------------- */
    if (!isAdminCreation) {
      const recentAttempts: SignupAttempt[] =
        await this.prisma.signupAttempt.findMany({
          where: {
            ip,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        });

      if (recentAttempts.length >= 3) {
        throw new ConflictException(
          'Trop de comptes créés depuis cette IP. Réessayez demain.',
        );
      }

      await this.prisma.signupAttempt.create({ data: { ip } });
    }

    /* ---------------------------------------------------------
   * 3) Vérifie un utilisateur avec cet email existe déjà
   --------------------------------------------------------- */
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Un utilisateur possède déjà cet email');
    }

    /* -------------------------
   * 4) Hash du mot de passe
   -------------------------- */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* ---------------------------------------------------------
   * 5) Gestion du rôle dynamique (USER / ADMIN / autre)
   --------------------------------------------------------- */
    const desiredRole = createUserDto.role ?? 'USER';

    let role = await this.prisma.role.findUnique({
      where: { name: desiredRole },
    });

    if (!role) {
      role = await this.prisma.role.create({ data: { name: desiredRole } });
    }

    /* -----------------------------
   * 6) Création du user
   ------------------------------ */
    const user = await this.prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        roleId: role.id,
      },
    });

    /* -----------------------------
   * 7) Tokens
   ------------------------------ */
    const access_token = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return { user, access_token, refreshToken };
  }

  /* -----------------------------------------------
 * LOGIN
 ------------------------------------------------ */
  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Identifiants invalides');

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
        createdAt: user.createdAt,
      },
      access_token,
      refreshToken,
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
    } catch (err) {
      console.error('Erreur refresh token:', err);
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  /* -------------------------------------------------------------------
   * REFRESH ACCES TOKEN ET RENVOI UN NOUVEAU REFRESH TOKEN
   ------------------------------------------------------------------- */
  async refreshAccessTokenAndUpdateToken(oldRefreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtRefreshPayload>(oldRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Utilisateur invalide');
      }

      // Vérifie que le refresh token hashé correspond
      const isTokenValid = await bcrypt.compare(
        oldRefreshToken,
        user.refreshToken,
      );
      if (!isTokenValid) {
        throw new UnauthorizedException('Refresh token invalide');
      }

      // Génère de nouveaux tokens
      const access_token = await this.generateAccessToken(user);
      const newRefreshToken = await this.generateRefreshToken(user);
      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

      // Stocke le nouveau refresh token hashé
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
      });

      return { access_token, refreshToken: newRefreshToken };
    } catch (err) {
      console.error('Erreur refresh token:', err);
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  /* -----------------------------------------------
 * LOGOUT
 ------------------------------------------------ */
  async logout(userId: number) {
    // Supprime le refresh token en base
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

    const resetToken = await this.jwt.signAsync(
      { sub: user.id },
      {
        secret: this.configService.get('JWT_RESET_SECRET'),
        expiresIn:
          Number(this.configService.get('JWT_RESET_EXPIRATION')) || 900,
      },
    );

    const resetLink = `https://ton-domaine.com/reset-password?token=${resetToken}`;

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
    } catch (err) {
      console.error('Erreur reset password:', err);
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}
