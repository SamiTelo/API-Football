import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/mail/mail.service';
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

const configMock: { get: jest.Mock<string | undefined, [string]> } = {
  get: jest.fn((key: string) => {
    const env: Record<string, string> = {
      JWT_SECRET: 'secret',
      JWT_REFRESH_SECRET: 'refresh',
      JWT_RESET_SECRET: 'reset',
      JWT_VERIFY_SECRET: 'verify',
      JWT_EXPIRATION: '3600',
      JWT_REFRESH_EXPIRATION: '86400',
      JWT_RESET_EXPIRATION: '900',
      FRONTEND_URL: 'http://localhost:3000',
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

  it('devrait lancer ConflictException si trop de comptes depuis la même IP', async () => {
    prismaMock.signupAttempt.count.mockResolvedValue(3);

    await expect(
      service.register(
        { firstName: '', lastName: '', email: '', password: '' },
        '127.0.0.1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('devrait lancer ConflictException si email déjà utilisé', async () => {
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

  it('devrait lancer une erreur si le rôle USER est manquant', async () => {
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
// Test Utilisateur inexistant
describe('utilisateur inexistant', () => {
  it('doit échouer si utilisateur introuvable', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'test@mail.com', password: 'pass123' }),
    ).rejects.toThrow(new UnauthorizedException('Identifiants invalides'));
  });
});

// Test Email non vérifié
describe('email non vérifié', () => {
  it('doit échouer si email non vérifié', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      password: 'hashed',
      isVerified: false,
      role: { name: 'USER' },
    });

    await expect(
      service.login({ email: 'test@mail.com', password: 'pass123' }),
    ).rejects.toThrow(new UnauthorizedException('Identifiants invalides'));
  });
});

// Test Mot de passe invalide
describe('mot de passe invalide', () => {
  it('doit échouer si mot de passe incorrect', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      password: 'hashed',
      isVerified: true,
      role: { name: 'USER' },
    });

    (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'test@mail.com', password: 'wrongpass' }),
    ).rejects.toThrow(new UnauthorizedException('Identifiants invalides'));
  });
});

// Test Login OK (USER, sans 2FA)
describe('login OK (USER, sans 2FA)', () => {
  it('doit retourner les tokens si login valide (USER)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@mail.com',
      password: 'hashed',
      isVerified: true,
      role: { name: 'USER' },
    });

    (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(true);

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
    expect(result.user!.email).toBe('test@mail.com');
  });
});

// Test Login ADMIN → 2FA requis
describe('login ADMIN → 2FA requis', () => {
  it('doit demander le 2FA pour un ADMIN', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 2,
      firstName: 'Admin',
      email: 'admin@mail.com',
      password: 'hashed',
      isVerified: true,
      role: { name: 'ADMIN' },
    });

    (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(true);
    prismaMock.user.update.mockResolvedValue({});
    mailMock.sendMail.mockResolvedValue(undefined);

    const result = await service.login({
      email: 'admin@mail.com',
      password: 'pass123',
    });

    expect(result.twoFactorRequired).toBe(true);
    expect(result.userId).toBe(2);
    expect(mailMock.sendMail).toHaveBeenCalled();
  });
});

// Test VERIFY EMAIL
describe('verifyEmail', () => {
  it('doit activer le compte', async () => {
    jwtMock.verify.mockReturnValue({ sub: 1 });
    prismaMock.user.update.mockResolvedValue({});

    const result = await service.verifyEmail('token');

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isVerified: true },
    });

    expect(result.message).toContain('Email vérifié');
  });
});

//==================================================
// VERIFY 2FA
//==================================================
// Code invalidde
describe('2FA invalide', () => {
  it('doit échouer si code 2FA invalide', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      twoFactorCode: 'hashed-code',
      twoFactorExpiry: new Date(Date.now() + 10000),
    });

    (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(false);
    await expect(service.verify2fa(1, '123456')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
// Code validde
describe('2FA valide', () => {
  it('doit valider le 2FA et retourner les tokens', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      twoFactorCode: 'hashed-code',
      twoFactorExpiry: new Date(Date.now() + 10000),
    });

    (jest.spyOn(bcrypt, 'compare') as jest.Mock).mockResolvedValue(true);

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
