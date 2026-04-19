import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './jwt.strategy';
import { ForgotPasswordDto } from './dto/Password/forgot-password.dto';
import { ResetPasswordDto } from './dto/Password/reset-password.dto';
import { RolesGuard } from './guards/roles.guard';
import { Throttle } from '@nestjs/throttler';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GoogleAuthService } from './google-auth.service';
import { GoogleLoginDto } from './dto/google-login-user-dto';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  /* -----------------------------------------------
   * HELPER COOKIE CONFIG 
   ------------------------------------------------ */
  private accessCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: 15 * 60 * 1000, // 15 min
    path: '/',
  };

  private refreshCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: 24 * 3600 * 1000, // 24h
    path: '/',
  };

  private tempCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: 10 * 60 * 1000, // 10 min
    path: '/',
  };

  /* -----------------------------------------------
   * REGISTER
   ------------------------------------------------ */
  @Post('register')
  register(@Req() req: Request, @Body() dto: CreateUserDto) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    return this.authService.register(dto, ip);
  }

  /* -----------------------------------------------
   * EMAIL VERIFICATION
   ------------------------------------------------ */
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refreshToken, user } =
      await this.authService.verifyEmail(dto.token);

    res.cookie('access_token', access_token, this.accessCookieOptions);
    res.cookie('refreshToken', refreshToken, this.refreshCookieOptions);

    return { user };
  }

  /* -----------------------------------------------
   * RESEND VERIFICATION EMAIL
   ------------------------------------------------ */
  @Post('resend-verification')
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  /* -----------------------------------------------
   * CREATE ADMIN
   ------------------------------------------------ */
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('create-admin')
  async createAdmin(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    return this.authService.createAdmin(createUserDto, ip);
  }

  /* -----------------------------------------------
   * LOGIN WITH GOOGLE
  ------------------------------------------------ */
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 5, ttl: 60 })
  @Post('google-login')
  async loginWithGoogle(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, access_token, refreshToken } =
      await this.googleAuthService.loginWithGoogle(dto.idToken);

    res.cookie('access_token', access_token, this.accessCookieOptions);
    res.cookie('refreshToken', refreshToken, this.refreshCookieOptions);

    return { user };
  }

  /* -----------------------------------------------
   * LOGIN
  ------------------------------------------------ */
  @Post('login')
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 5, ttl: 60 })
  async login(
    @Body() dto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    if ('requires2FA' in result) {
      if (result.userId == null) {
        throw new Error("Impossible de récupérer l'ID utilisateur pour 2FA");
      }

      res.cookie(
        'pending2FAUser',
        result.userId.toString(),
        this.tempCookieOptions,
      );
      res.cookie('twoFARequired', 'true', this.tempCookieOptions);

      return { requires2FA: true };
    }

    const { access_token, refreshToken, user } = result;

    res.cookie('access_token', access_token, this.accessCookieOptions);
    res.cookie('refreshToken', refreshToken, this.refreshCookieOptions);

    return { user };
  }

  /* -----------------------------------------------
   * VERIFY 2FA
  ------------------------------------------------ */
  @Post('verify-2fa')
  async verify2fa(
    @Body() dto: { code: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pendingUserIdStr = req.cookies['pending2FAUser'] as
      | string
      | undefined;

    if (!pendingUserIdStr) {
      throw new UnauthorizedException('Session 2FA expirée');
    }

    const pendingUserId = Number(pendingUserIdStr);

    if (Number.isNaN(pendingUserId)) {
      throw new UnauthorizedException('Session 2FA invalide');
    }

    const { access_token, refreshToken, user } =
      await this.authService.verify2fa(pendingUserId, dto.code);

    res.clearCookie('pending2FAUser', { path: '/' });
    res.clearCookie('twoFARequired', { path: '/' });

    res.cookie('access_token', access_token, this.accessCookieOptions);
    res.cookie('refreshToken', refreshToken, this.refreshCookieOptions);

    return { user };
  }

  /* -----------------------------------------------
   * PROFILE
   ------------------------------------------------ */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.validateUser(req.user.sub);
  }

  /* -----------------------------------------------
   * REFRESH TOKEN
   ------------------------------------------------ */
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 20, ttl: 60 })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string>;
    const oldRefreshToken = cookies['refreshToken'];

    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    const { access_token, refreshToken: newRefreshToken } =
      await this.authService.refreshAccessTokenAndUpdateToken(oldRefreshToken);

    res.cookie('access_token', access_token, this.accessCookieOptions);
    res.cookie('refreshToken', newRefreshToken, this.refreshCookieOptions);

    return { access_token };
  }

  /* -----------------------------------------------
   * LOGOUT
   ------------------------------------------------ */
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('pending2FAUser', { path: '/' });
    res.clearCookie('twoFARequired', { path: '/' });

    return { message: 'Déconnexion réussie' };
  }

  /* -----------------------------------------------
   * FORGOT PASSWORD
   ------------------------------------------------ */
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 3, ttl: 300 })
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /* -----------------------------------------------
   * RESET PASSWORD
   ------------------------------------------------ */
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 3, ttl: 300 })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
