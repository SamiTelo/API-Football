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
import { jwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from './jwt.strategy';
import { ForgotPasswordDto } from './dto/Password/forgot-password.dto';
import { ResetPasswordDto } from './dto/Password/reset-password.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';
import { Throttle } from '@nestjs/throttler';
import { VerifyEmailDto } from './dto/verify-email.dto';

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /* -----------------------------------------------
   * REGISTER (email non vérifié)
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
   * VERIFICATION EMAIL
   ------------------------------------------------ */
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  /* -----------------------------------------------
   * CREATE ADMIN
   ------------------------------------------------ */
  @UseGuards(jwtAuthGuard, RolesGuard)
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
   * LOGIN (bloqué si email non vérifié)
   ------------------------------------------------ */
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl
  @Throttle({ limit: 5, ttl: 60 })
  @Post('login')
  async login(
    @Body() dto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refreshToken, user } =
      await this.authService.login(dto);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 3600 * 1000,
    });

    return { user, access_token };
  }

  /* -----------------------------------------------
   * PROFILE
   ------------------------------------------------ */
  @UseGuards(jwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.validateUser(req.user.sub);
  }

  /* -----------------------------------------------
   * REFRESH TOKEN (rotation)
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

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 3600 * 1000,
    });

    return { access_token };
  }

  /* -----------------------------------------------
   * LOGOUT
   ------------------------------------------------ */
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

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
