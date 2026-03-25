"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const supertest_1 = __importDefault(require("supertest"));
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma/prisma.service");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const bcrypt = __importStar(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
describe('AuthController (e2e)', () => {
    let app;
    let prisma;
    let superadminEmail;
    const superadminPassword = 'SuperAdmin123!';
    let adminEmail;
    const adminPassword = 'Admin123!';
    jest.setTimeout(30000);
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleRef.createNestApplication();
        app.use((0, cookie_parser_1.default)());
        app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true }));
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
        await prisma.signupAttempt.deleteMany();
        await prisma.user.deleteMany({
            where: { email: { contains: 'test+' } },
        });
        superadminEmail = `superadmin+${Date.now()}@example.com`;
        const superadminRole = await prisma.role.findUnique({
            where: { name: 'SUPERADMIN' },
        });
        if (!superadminRole)
            throw new Error('Role SUPERADMIN missing in DB');
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
        if (!adminRole)
            throw new Error('Role ADMIN missing in DB');
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
        await app.close();
    });
    describe('USER workflow', () => {
        it('FULL AUTH FLOW (register -> verify -> login -> profile -> refresh -> logout)', async () => {
            const email = `test+${Date.now()}@example.com`;
            const password = 'Password123!';
            const registerResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/register')
                .send({
                email,
                password,
                firstName: 'Samuel',
                lastName: 'Telo',
            })
                .expect(201);
            expect(registerResponse.body).toHaveProperty('message', 'Compte créé. Vérifiez votre email pour l’activer.');
            await prisma.user.update({
                where: { email },
                data: { isVerified: true },
            });
            const loginResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/login')
                .send({ email, password })
                .expect(201);
            const token = loginResponse.body
                .access_token;
            const cookies = loginResponse.headers['set-cookie'];
            expect(loginResponse.body).toHaveProperty('access_token');
            expect(loginResponse.body).toHaveProperty('user');
            expect(token).toBeDefined();
            const profileResponse = await (0, supertest_1.default)(app.getHttpServer())
                .get('/auth/profile')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            expect(profileResponse.body).toHaveProperty('email', email);
            const refreshResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/refresh')
                .set('Cookie', cookies)
                .expect(201);
            expect(refreshResponse.body).toHaveProperty('access_token');
            const logoutResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/logout')
                .expect(201);
            expect(logoutResponse.body).toHaveProperty('message', 'Déconnexion réussie');
        });
    });
    describe('POST /auth/login (ADMIN)', () => {
        it('devrait renvoyer twoFactorRequired pour ADMIN', async () => {
            const loginRes = await (0, supertest_1.default)(app.getHttpServer())
                .post('/auth/login')
                .send({ email: adminEmail, password: adminPassword })
                .expect(201);
            const loginBody = loginRes.body;
            expect(loginBody.twoFactorRequired).toBe(true);
            expect(loginBody.userId).toBeDefined();
            const user = await prisma.user.findUnique({
                where: { id: loginBody.userId },
            });
            expect(user.twoFactorCode).toBeDefined();
        });
        describe('POST /auth/forgot-password', () => {
            it('devrait renvoyer un message de confirmation', async () => {
                const res = await (0, supertest_1.default)(app.getHttpServer())
                    .post('/auth/forgot-password')
                    .send({ email: adminEmail })
                    .expect(201);
                expect(res.body).toHaveProperty('message');
            });
        });
        describe('POST /auth/reset-password', () => {
            it('devrait réinitialiser le mot de passe', async () => {
                const user = await prisma.user.findUnique({
                    where: { email: adminEmail },
                });
                expect(user).not.toBeNull();
                const token = jsonwebtoken_1.default.sign({ sub: user.id }, process.env.JWT_RESET_SECRET || 'defaultResetSecret', { expiresIn: '1h' });
                const res = await (0, supertest_1.default)(app.getHttpServer())
                    .post('/auth/reset-password')
                    .send({ token, newPassword: 'AdminNew123!' })
                    .expect(201);
                expect(res.body).toHaveProperty('message');
            });
        });
    });
});
//# sourceMappingURL=auth.e2e-spec.js.map