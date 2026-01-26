import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import cookieParser from 'cookie-parser';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  /* -------------------------------------------------- *
  INITIALISATION DE L'APPLICATION 
  * ------------------------------------------------ 
  * Avant tous les tests, on crée une instance 
  * complète de NestJS avec le module principal AppModule.  
  * On applique aussi la ValidationPipe globale pour
  * que les DTO soient validés comme dans l'app réelle.
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

    //  NETTOYAGE POUR E2E
    await prisma.signupAttempt.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { contains: 'test+' } },
    });
  });

  /* ------------------------------------------------ 
  * FERMETURE DE L'APPLICATION 
  * ----------------------------------------------------- 
  * Après tous les tests, on ferme proprement l'application
  * pour libérer les ressources et éviter les conflits
  * sur le port HTTP.
  ------------------------------------------------- */
  afterAll(async () => {
    await app.close();
  });

  /* ------------------------------------------------ 
  * FULL AUTH FLOW TEST 
  ------------------------------------------------- */
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

    const token = (loginResponse.body as { access_token: string }).access_token;
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
