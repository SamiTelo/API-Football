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

interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 🔹 REGISTER
  @Post('register')
  async register(
    @Req() req: Request,
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown';

    const { user, access_token, refreshToken } =
      await this.authService.register(createUserDto, ip);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 3600 * 1000,
    });

    return { user, access_token };
  }

  // CREATE ADMIN
  @UseGuards(jwtAuthGuard, RolesGuard)
  @Roles('SUPERADMIN')
  @Post('create-admin')
  async createAdmin(@Body() createUserDto: CreateUserDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      req.ip ||
      'unknown';
    // force la creation du role ADMIN
    createUserDto.role = 'ADMIN';

    return this.authService.register(createUserDto, ip);
  }

  // 🔹 LOGIN
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl sur ThrottlerMethodOrControllerOptions
  @Throttle({ limit: 5, ttl: 60 }) // 5 requêtes par 60 secondes
  @Post('login')
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, access_token, refreshToken } =
      await this.authService.login(loginUserDto);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 3600 * 1000,
    });

    return { user, access_token };
  }

  // 🔹 PROFILE
  @UseGuards(jwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.authService.validateUser(req.user.sub);
  }

  // 🔹 REFRESH ACCESS TOKEN AVEC RENOUVELLEMENT DU REFRESH TOKEN
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl sur ThrottlerMethodOrControllerOptions
  @Throttle({ limit: 20, ttl: 60 }) // 20 requêtes par 60 secondes
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Typage sûr des cookies
    const cookies = req.cookies as Record<string, string>;
    const oldRefreshToken = cookies['refreshToken'];

    if (!oldRefreshToken)
      throw new UnauthorizedException('Refresh token manquant');

    // Vérifie et génère un nouvel access token
    const { access_token, refreshToken: newRefreshToken } =
      await this.authService.refreshAccessTokenAndUpdateToken(oldRefreshToken);

    // On place le nouveau refresh token dans un cookie HttpOnly
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 3600 * 1000, // 24h
    });

    return { access_token };
  }

  // 🔹 LOGOUT
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return { message: 'Déconnexion réussie' };
  }

  // 🔹 FORGOT PASSWORD
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl sur ThrottlerMethodOrControllerOptions
  @Throttle({ limit: 3, ttl: 300 }) // 3 requêtes / 5 minutes
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // 🔹 RESET PASSWORD
  // @ts-expect-error: TS ne reconnaît pas les propriétés limit/ttl sur ThrottlerMethodOrControllerOptions
  @Throttle({ limit: 3, ttl: 300 }) // 3 requêtes / 5 minutes
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
