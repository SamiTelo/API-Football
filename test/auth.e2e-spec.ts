import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superadminEmail: string;
  const superadminPassword = 'SuperAdmin123!';
  let adminEmail: string;
  const adminPassword = 'Admin123!';

  /* -------------------------------------------------- *
  INITIALISATION DE L'APPLICATION 
  --------------------------------------------------------------- */
  jest.setTimeout(30000); // Timeout plus long pour éviter les erreurs si DB lent

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Prisma pour manipuler la DB pendant les tests
    prisma = app.get(PrismaService);

    // Nettoyage DB pour tests
    await prisma.signupAttempt.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { contains: 'test+' } },
    });

    // Crée SUPERADMIN
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

    // Crée ADMIN
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

  /* ------------------------------------------------ 
  * FERMETURE DE L'APPLICATION 
  ------------------------------------------------- */
  afterAll(async () => {
    await app.close();
  });

  /* ------------------------------------------------ 
  *  WORKFLOW 1 : FULL AUTH FLOW TEST USER
  ------------------------------------------------- */
  describe('USER workflow', () => {
    it('FULL AUTH FLOW (register -> verify -> login -> profile -> refresh -> logout)', async () => {
      const email = `test+${Date.now()}@example.com`; //  Générer un email unique pour éviter conflit
      const password = 'Password123!';

      //---------------------------------------------
      //  REGISTER
      //---------------------------------------------
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

      // Comme l'API renvoie juste un message, on teste le message
      expect(registerResponse.body).toHaveProperty(
        'message',
        'Compte créé. Vérifiez votre email pour l’activer.',
      );

      //---------------------------------------------
      //  SIMULER VERIFICATION EMAIL
      //---------------------------------------------
      await prisma.user.update({
        where: { email },
        data: { isVerified: true },
      });

      //---------------------------------------------
      //  LOGIN
      //---------------------------------------------
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);

      const token = (loginResponse.body as { access_token: string })
        .access_token;
      const cookies = loginResponse.headers['set-cookie'];

      expect(loginResponse.body).toHaveProperty('access_token');
      expect(loginResponse.body).toHaveProperty('user');
      expect(token).toBeDefined(); // Vérifie que le token est présent

      //---------------------------------------------
      //  PROFILE
      //---------------------------------------------
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body).toHaveProperty('email', email);

      //---------------------------------------------
      //  REFRESH TOKEN
      //---------------------------------------------
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .expect(201);

      expect(refreshResponse.body).toHaveProperty('access_token');

      //---------------------------------------------
      //  LOGOUT
      //---------------------------------------------
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

  /* ---------------------------
   * LOGIN ADMIN (2FA)
   --------------------------- */
  describe('POST /auth/login (ADMIN)', () => {
    it('devrait renvoyer twoFactorRequired pour ADMIN', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: adminEmail, password: adminPassword })
        .expect(201);

      const loginBody = loginRes.body as {
        twoFactorRequired?: boolean;
        userId?: number;
      };
      expect(loginBody.twoFactorRequired).toBe(true);
      expect(loginBody.userId).toBeDefined();

      // Vérifier que le code 2FA existe en DB
      const user = await prisma.user.findUnique({
        where: { id: loginBody.userId },
      });
      expect(user!.twoFactorCode).toBeDefined();
    });

    /* ---------------------------
   * FORGOT PASSWORD
   --------------------------- */
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
    /* ---------------------------
   * RESET PASSWORD
   --------------------------- */
    describe('POST /auth/reset-password', () => {
      it('devrait réinitialiser le mot de passe', async () => {
        // Vérifier que l'utilisateur existe
        const user = await prisma.user.findUnique({
          where: { email: adminEmail },
        });
        expect(user).not.toBeNull();

        // Générer un JWT valide pour le test
        const token = jwt.sign(
          { sub: user!.id },
          process.env.JWT_RESET_SECRET || 'defaultResetSecret', // ou le secret utilisé dans ton AuthService
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
