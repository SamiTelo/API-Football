import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

//--------------------------------------------------
// Prisma mock
//--------------------------------------------------
const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
  signupAttempt: {
    count: jest.fn(),
    create: jest.fn(),
  },
};

//--------------------------------------------------
// bcrypt mock
//--------------------------------------------------
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

//--------------------------------------------------
// Other mocks
//--------------------------------------------------
const jwtMock = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mailMock = {
  sendMail: jest.fn(),
};

const configMock: {
  get: jest.Mock<string | undefined, [string]>;
  getOrThrow: jest.Mock<string, [string]>;
} = {
  get: jest.fn((key: string) => {
    const env: Record<string, string> = {
      JWT_SECRET: 'secret',
      JWT_REFRESH_SECRET: 'refresh',
      JWT_RESET_SECRET: 'reset',
      JWT_VERIFY_SECRET: 'verify',
      JWT_EXPIRATION: '3600',
      JWT_REFRESH_EXPIRATION: '86400',
      JWT_RESET_EXPIRATION: '900',
      FRONTEND_URL: 'http://localhost:3004',
    };
    return env[key];
  }),
  getOrThrow: jest.fn((key: string) => {
    const env: Record<string, string> = {
      JWT_SECRET: 'secret',
      JWT_REFRESH_SECRET: 'refresh',
      JWT_RESET_SECRET: 'reset',
      JWT_VERIFY_SECRET: 'verify',
      JWT_EXPIRATION: '3600',
      JWT_REFRESH_EXPIRATION: '86400',
      JWT_RESET_EXPIRATION: '900',
      FRONTEND_URL: 'http://localhost:3004',
    };
    return env[key];
  }),
};

//--------------------------------------------------
// Setup
//--------------------------------------------------
let service: AuthService;

beforeEach(async () => {
  jest.clearAllMocks();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: JwtService, useValue: jwtMock },
      { provide: MailService, useValue: mailMock },
      { provide: ConfigService, useValue: configMock },
    ],
  }).compile();

  service = module.get<AuthService>(AuthService);
});

//==================================================
// REGISTER
//==================================================
describe('register', () => {
  it('devrait créer un utilisateur et envoyer un email', async () => {
    prismaMock.signupAttempt.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.findUnique.mockResolvedValue({ id: 1, name: 'USER' });
    prismaMock.user.create.mockResolvedValue({
      id: 1,
      firstName: 'Test',
      email: 'test@mail.com',
    });

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

    jest
      .spyOn(service as any, 'generateToken')
      .mockResolvedValue('verify-token');
    jest
      .spyOn(service as any, 'getFrontendUrl')
      .mockReturnValue('http://localhost:3000');

    const dto = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@mail.com',
      password: 'password123',
    };
    const result = await service.register(dto, '127.0.0.1');

    expect(result.message).toContain('Compte créé');
    expect(prismaMock.signupAttempt.create).toHaveBeenCalledWith({
      data: { ip: '127.0.0.1' },
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: 'hashedPassword',
        roleId: 1,
        isVerified: false,
      },
    });
    expect(mailMock.sendMail).toHaveBeenCalledWith(
      dto.email,
      'Confirmez votre email',
      expect.stringContaining('verify-token'),
    );
  });

  it('doit lancer ConflictException si trop de comptes depuis la même IP', async () => {
    prismaMock.signupAttempt.count.mockResolvedValue(3);
    await expect(
      service.register(
        { firstName: '', lastName: '', email: '', password: '' },
        '127.0.0.1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('doit lancer ConflictException si email déjà utilisé', async () => {
    prismaMock.signupAttempt.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'exists@mail.com',
    });
    await expect(
      service.register(
        { firstName: '', lastName: '', email: 'exists@mail.com', password: '' },
        '127.0.0.1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('doit lancer une erreur si le rôle USER est manquant', async () => {
    prismaMock.signupAttempt.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.findUnique.mockResolvedValue(null);
    await expect(
      service.register(
        { firstName: '', lastName: '', email: '', password: '' },
        '127.0.0.1',
      ),
    ).rejects.toThrow(Error);
  });
});

//==================================================
// LOGIN
//==================================================
// Nonexistent User
describe('login - Nonexistent User', () => {
  it('échoue si utilisateur introuvable', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'test@mail.com', password: 'pass123' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// Unverified Email
describe('login - Unverified Email', () => {
  it('échoue si email non vérifié', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      password: 'hashed',
      isVerified: false,
      provider: 'local',
      role: { name: 'USER' },
    });
    await expect(
      service.login({ email: 'test@mail.com', password: 'pass123' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// Invalid Password
describe('login - Invalid Password', () => {
  it('échoue si mot de passe incorrect', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      password: 'hashed',
      isVerified: true,
      provider: 'local',
      role: { name: 'USER' },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.login({ email: 'test@mail.com', password: 'wrongpass' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// Local User without password
describe('login - Local User without Password', () => {
  it('échoue si password manquant', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 2,
      email: 'nopass@mail.com',
      password: null,
      isVerified: true,
      provider: 'local',
      role: { name: 'USER' },
    });
    await expect(
      service.login({ email: 'nopass@mail.com', password: 'anypass' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// Google account
describe('login - Google User', () => {
  it('échoue si compte Google', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 3,
      email: 'google@mail.com',
      password: null,
      isVerified: true,
      provider: 'google',
      role: { name: 'USER' },
    });
    await expect(
      service.login({ email: 'google@mail.com', password: 'anypass' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// Successful login USER
describe('login - USER', () => {
  it('retourne tokens', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 4,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@mail.com',
      password: 'hashed',
      isVerified: true,
      provider: 'local',
      role: { name: 'USER' },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jest
      .spyOn(service as any, 'generateAccessToken')
      .mockResolvedValue('access-token');
    jest
      .spyOn(service as any, 'generateRefreshToken')
      .mockResolvedValue('refresh-token');
    prismaMock.user.update.mockResolvedValue({});
    const result = await service.login({
      email: 'test@mail.com',
      password: 'pass123',
    });
    expect(result.access_token).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    const userResult = result as {
      user: { id: number; firstName: string; lastName: string; email: string };
      access_token: string;
      refreshToken: string;
    };
    expect(userResult.user.email).toBe('test@mail.com');
  });
});

// ADMIN / SUPERADMIN 2FA
describe('login - 2FA ADMIN/SUPERADMIN', () => {
  it('demande 2FA pour ADMIN', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 5,
      firstName: 'Admin',
      email: 'admin@mail.com',
      password: 'hashed',
      isVerified: true,
      provider: 'local',
      role: { name: 'ADMIN' },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prismaMock.user.update.mockResolvedValue({});
    mailMock.sendMail.mockResolvedValue(undefined);
    const result = await service.login({
      email: 'admin@mail.com',
      password: 'pass123',
    });
    expect(result.requires2FA).toBe(true);
    expect(result.userId).toBe(5);
    expect(mailMock.sendMail).toHaveBeenCalled();
  });

  it('demande 2FA pour SUPERADMIN', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 6,
      firstName: 'Super',
      email: 'super@mail.com',
      password: 'hashed',
      isVerified: true,
      provider: 'local',
      role: { name: 'SUPERADMIN' },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    prismaMock.user.update.mockResolvedValue({});
    mailMock.sendMail.mockResolvedValue(undefined);
    const result = await service.login({
      email: 'super@mail.com',
      password: 'pass123',
    });
    expect(result.requires2FA).toBe(true);
    expect(result.userId).toBe(6);
    expect(mailMock.sendMail).toHaveBeenCalled();
  });
});

//==================================================
// RESEND VERIFICATION EMAIL
//==================================================
describe('resendVerification', () => {
  it('doit renvoyer un nouveau lien si conditions ok', async () => {
    const now = new Date();
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      firstName: 'Test',
      email: 'test@mail.com',
      isVerified: false,
      role: { name: 'USER' },
      lastVerificationSentAt: new Date(now.getTime() - 11 * 60 * 1000), // plus de 10 min
    });
    prismaMock.user.update.mockResolvedValue({});

    jest
      .spyOn(service as any, 'generateToken')
      .mockResolvedValue('new-verify-token');
    jest
      .spyOn(service as any, 'getFrontendUrl')
      .mockReturnValue('http://localhost:3004');

    const result = await service.resendVerification('test@mail.com');

    expect(mailMock.sendMail).toHaveBeenCalledWith(
      'test@mail.com',
      'Confirmez votre email',
      expect.stringContaining('new-verify-token'),
    );
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(result.message).toContain('Un nouveau lien');
  });

  it('doit bloquer si délai < 10 min', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      firstName: 'Test',
      email: 'test@mail.com',
      isVerified: false,
      role: { name: 'USER' },
      lastVerificationSentAt: new Date(),
    });

    await expect(service.resendVerification('test@mail.com')).rejects.toThrow();
  });
});

//==================================================
// VERIFY 2FA
//==================================================
describe('2FA invalide', () => {
  it('doit échouer si mauvais code', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      twoFactorCode: 'hashed',
      twoFactorExpiry: new Date(Date.now() + 10000),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.verify2fa(1, '000000')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('2FA expiré', () => {
  it('doit échouer si code expiré', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      twoFactorCode: 'hashed',
      twoFactorExpiry: new Date(Date.now() - 10000),
    });

    await expect(service.verify2fa(1, '123456')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('2FA valide', () => {
  it('doit retourner tokens et user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@mail.com',
      role: { name: 'ADMIN' },
      twoFactorCode: 'hashed',
      twoFactorExpiry: new Date(Date.now() + 10000),
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');

    jest
      .spyOn(service as any, 'generateAccessToken')
      .mockResolvedValue('access-token');

    jest
      .spyOn(service as any, 'generateRefreshToken')
      .mockResolvedValue('refresh-token');

    prismaMock.user.update.mockResolvedValue({});

    const result = await service.verify2fa(1, '123456');

    expect(result.access_token).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.email).toBe('admin@mail.com');
  });
});

//==================================================
// REFRESH TOKEN ROTATION
//==================================================
describe('refreshAccessTokenAndUpdateToken', () => {
  it('doit générer un nouveau access et refresh token', async () => {
    jwtMock.verify.mockReturnValue({ sub: 1 });

    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      refreshToken: 'hashed-refresh',
    });

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    jest
      .spyOn(service as any, 'generateAccessToken')
      .mockResolvedValue('new-access');

    jest
      .spyOn(service as any, 'generateRefreshToken')
      .mockResolvedValue('new-refresh');

    const result =
      await service.refreshAccessTokenAndUpdateToken('old-refresh');

    expect(result.access_token).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
  });
});

//==================================================
// FORGOT PASSWORD
//==================================================
describe('forgotPassword', () => {
  it('doit envoyer un email de reset', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      firstName: 'Test',
      lastName: 'User',
    });

    jwtMock.signAsync.mockResolvedValue('reset-token');

    const result = await service.forgotPassword({
      email: 'test@mail.com',
    });

    expect(mailMock.sendMail).toHaveBeenCalled();
    expect(result.message).toContain('réinitialisation');
  });
});

//==================================================
// RESET PASSWORD
//==================================================
describe('resetPassword', () => {
  it('doit mettre à jour le mot de passe', async () => {
    jwtMock.verify.mockReturnValue({ sub: 1 });
    prismaMock.user.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.user.update.mockResolvedValue({});

    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    const result = await service.resetPassword({
      token: 'reset-token',
      newPassword: 'newpass123',
    });

    expect(bcrypt.hash).toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(result.message).toContain('succès');
  });
});
