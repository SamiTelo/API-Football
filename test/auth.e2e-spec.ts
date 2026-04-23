import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { MailService } from '../src/mail/mail.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superadminEmail: string;
  const superadminPassword = 'SuperAdmin123!';
  let adminEmail: string;
  const adminPassword = 'Admin123!';

  jest.setTimeout(30000);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailService)
      .useValue({
        sendMail: jest.fn().mockResolvedValue(true),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.signupAttempt.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { contains: 'test+' } },
    });

    superadminEmail = `superadmin+${Date.now()}@example.com`;
    const superadminRole = await prisma.role.findUnique({
      where: { name: 'SUPERADMIN' },
    });
    if (!superadminRole) throw new Error('Role SUPERADMIN missing in DB');

    await prisma.user.create({
      data: {
        email: superadminEmail,
        password: await bcrypt.hash(superadminPassword, 10),
        firstName: 'Super',
        lastName: 'Admin',
        roleId: superadminRole.id,
        isVerified: true,
      },
    });

    adminEmail = `admin+${Date.now()}@example.com`;
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' },
    });
    if (!adminRole) throw new Error('Role ADMIN missing in DB');

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        firstName: 'Existing',
        lastName: 'Admin',
        roleId: adminRole.id,
        isVerified: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  /* -------------------------------
   * USER FLOW
   --------------------------------*/
  describe('USER workflow', () => {
    it('FULL AUTH FLOW', async () => {
      const email = `test+${Date.now()}@example.com`;
      const password = 'Password123!';

      // REGISTER
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email,
          password,
          firstName: 'Samuel',
          lastName: 'Telo',
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty(
        'message',
        'Compte créé. Vérifiez votre email pour l’activer.',
      );

      await prisma.user.update({
        where: { email },
        data: { isVerified: true },
      });

      // LOGIN
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);

      const cookies = loginResponse.headers['set-cookie'] as unknown as
        | string[]
        | undefined;

      if (!cookies) throw new Error('No cookies returned');

      const accessTokenCookie = cookies.find((c) =>
        c.includes('access_token='),
      );

      if (!accessTokenCookie) throw new Error('No access_token cookie');

      const accessToken = accessTokenCookie
        .split('access_token=')[1]
        .split(';')[0];

      // PROFILE
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('email', email);

      // REFRESH
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .expect(201);

      expect(refreshResponse.body).toHaveProperty('access_token');

      // LOGOUT
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(201);

      expect(logoutResponse.body).toHaveProperty(
        'message',
        'Déconnexion réussie',
      );
    });
  });

  /* -------------------------------
   * ADMIN FLOW
   --------------------------------*/
  describe('POST /auth/login (ADMIN)', () => {
    it('devrait renvoyer requires2FA pour ADMIN', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: adminPassword })
        .expect(201);

      const loginBody = loginRes.body as { requires2FA?: boolean };
      expect(loginBody.requires2FA).toBe(true);

      const cookiesRaw = loginRes.headers['set-cookie'];
      const cookies: string[] = Array.isArray(cookiesRaw)
        ? cookiesRaw
        : cookiesRaw
          ? [cookiesRaw]
          : [];

      expect(cookies.some((c) => c.includes('twoFARequired'))).toBe(true);
    });

    /* FORGOT PASSWORD */
    describe('POST /auth/forgot-password', () => {
      it('devrait renvoyer un message de confirmation', async () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const res = await request(app.getHttpServer())
          .post('/auth/forgot-password')
          .send({ email: adminEmail })
          .expect(201);

        expect(res.body).toHaveProperty('message');
      });
    });

    /* RESET PASSWORD */
    describe('POST /auth/reset-password', () => {
      it('devrait réinitialiser le mot de passe', async () => {
        const user = await prisma.user.findUnique({
          where: { email: adminEmail },
        });

        expect(user).not.toBeNull();

        const token = jwt.sign(
          { sub: user!.id },
          process.env.JWT_RESET_SECRET || 'defaultResetSecret',
          { expiresIn: '1h' },
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const res = await request(app.getHttpServer())
          .post('/auth/reset-password')
          .send({ token, newPassword: 'AdminNew123!' })
          .expect(201);

        expect(res.body).toHaveProperty('message');
      });
    });
  });
});
