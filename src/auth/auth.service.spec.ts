import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

//--------------------------------------------------
//          Mocks des dépendances
//-------------------------------------------------------
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

const jwtMock = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mailMock = {
  sendMail: jest.fn(),
};

const configMock: { get: jest.Mock<string | undefined, [string]> } = {
  get: jest.fn((key: string): string | undefined => {
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

//-------------------------------------------------------------------
//                Initialisation du service (setup commun)
//-----------------------------------------------------------------------------
let service: AuthService;

beforeEach(async () => {
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

//------------------------------------------------------------
//              Test critique : REGISTER
//--------------------------------------------------------------------
describe('register', () => {
  it('doit créer un utilisateur et envoyer un email', async () => {
    prismaMock.signupAttempt.count.mockResolvedValue(0);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.findUnique.mockResolvedValue({ id: 1, name: 'USER' });
    prismaMock.user.create.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      firstName: 'Test',
    });

    jwtMock.signAsync.mockResolvedValue('verify-token');

    const result = await service.register(
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@mail.com',
        password: 'password123',
      },
      '127.0.0.1',
    );

    expect(prismaMock.user.create).toHaveBeenCalled();
    expect(mailMock.sendMail).toHaveBeenCalled();
    expect(result.message).toContain('Compte créé');
  });
});

//-------------------------------------------------------------
//                  Test critique : LOGIN
//--------------------------------------------------------------
describe('login', () => {
  it('doit retourner access_token et refreshToken', async () => {
    const hashedPassword = await bcrypt.hash('password', 10);

    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@mail.com',
      password: hashedPassword,
      isVerified: true,
    });

    jest
      .spyOn(service as any, 'generateAccessToken')
      .mockResolvedValue('access');
    jest
      .spyOn(service as any, 'generateRefreshToken')
      .mockResolvedValue('refresh');

    const result = await service.login({
      email: 'test@mail.com',
      password: 'password',
    });

    expect(result.access_token).toBe('access');
    expect(result.refreshToken).toBe('refresh');
  });
});

//-----------------------------------------------------------------
//            Test critique : REFRESH TOKEN ROTATION
//------------------------------------------------------------------------
describe('refreshAccessTokenAndUpdateToken', () => {
  it('doit générer un nouveau access et refresh token', async () => {
    jwtMock.verify.mockReturnValue({ sub: 1 });

    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      refreshToken: await bcrypt.hash('old-refresh', 10),
    });

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

//---------------------------------------------------------------------
//             Test critique : FORGOT PASSWORD
//---------------------------------------------------------------------
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

//-------------------------------------------------------------------
//               Test critique : RESET PASSWORD
//----------------------------------------------------------------------------
describe('resetPassword', () => {
  it('doit mettre à jour le mot de passe', async () => {
    jwtMock.verify.mockReturnValue({ sub: 1 });

    prismaMock.user.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.user.update.mockResolvedValue({});

    const result = await service.resetPassword({
      token: 'reset-token',
      newPassword: 'newpass123',
    });

    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(result.message).toContain('succès');
  });
});
