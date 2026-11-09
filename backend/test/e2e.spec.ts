import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('HTTP: auth, roles and validation', () => {
  let app: INestApplication;
  let memberToken: string;
  let librarianToken: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    const prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe('TRUNCATE "FinePayment","Fine","Reservation","Loan","Book","Setting","User" RESTART IDENTITY CASCADE');
    await prisma.user.create({ data: { name: 'Lib', email: 'lib@t.test', passwordHash: await bcrypt.hash('Password123!', 4), role: 'LIBRARIAN' } });
    const reg = await request(app.getHttpServer()).post('/auth/register').send({ name: 'Mem', email: 'mem@t.test', password: 'Password123!' });
    memberToken = reg.body.accessToken;
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: 'lib@t.test', password: 'Password123!' });
    librarianToken = login.body.accessToken;
  });
  afterAll(() => app.close());

  it('a member calling a librarian route gets 403', async () => {
    await request(app.getHttpServer()).get('/settings').set('Authorization', `Bearer ${memberToken}`).expect(403);
    await request(app.getHttpServer()).post('/books').set('Authorization', `Bearer ${memberToken}`).send({ title: 'X', author: 'Y', totalCopies: 1 }).expect(403);
  });

  it('no token gets 401', async () => {
    await request(app.getHttpServer()).get('/books').expect(401);
  });

  it('validation: missing title or negative copies gets 400', async () => {
    const auth = { Authorization: `Bearer ${librarianToken}` };
    await request(app.getHttpServer()).post('/books').set(auth).send({ author: 'Y', totalCopies: 1 }).expect(400);
    await request(app.getHttpServer()).post('/books').set(auth).send({ title: 'X', author: 'Y', totalCopies: -1 }).expect(400);
    await request(app.getHttpServer()).post('/books').set(auth).send({ title: 'X', author: 'Y', totalCopies: 2 }).expect(201);
  });
});

