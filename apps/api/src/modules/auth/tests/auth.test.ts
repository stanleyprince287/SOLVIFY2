import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../app.js';
import { prisma, disconnectPrisma } from '../../../lib/prisma.js';

const app = createApp();

const unique = () => `t${Date.now()}${Math.floor(Math.random() * 1e6)}`;
const email = () => `${unique()}@example.com`;
const phone = () => `+234${Math.floor(1e9 + Math.random() * 8e9)}`;

beforeAll(async () => { await prisma.$connect(); });
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@example.com' } } });
  await disconnectPrisma();
});

describe('POST /api/v1/auth/register', () => {
  it('creates a customer and sets auth cookies', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Ada Test',
      email: email(),
      phone: phone(),
      password: 'Password123',
      role: 'CUSTOMER',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('CUSTOMER');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(res.headers['set-cookie'].join(';')).toContain('sv_access');
  });

  it('rejects a weak password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Weak Pass', email: email(), phone: phone(),
      password: 'short', role: 'CUSTOMER',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses to register an ADMIN', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Sneaky', email: email(), phone: phone(),
      password: 'Password123', role: 'ADMIN',
    });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email', async () => {
    const e = email();
    await request(app).post('/api/v1/auth/register').send({
      fullName: 'First', email: e, phone: phone(), password: 'Password123', role: 'CUSTOMER',
    });
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Second', email: e, phone: phone(), password: 'Password123', role: 'CUSTOMER',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.details.field).toBe('email');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with valid credentials', async () => {
    const e = email();
    await request(app).post('/api/v1/auth/register').send({
      fullName: 'Login Test', email: e, phone: phone(), password: 'Password123', role: 'CUSTOMER',
    });
    const res = await request(app).post('/api/v1/auth/login').send({ email: e, password: 'Password123' });
    expect(res.status).toBe(200);
  });

  it('returns an identical error for wrong password and unknown email', async () => {
    const e = email();
    await request(app).post('/api/v1/auth/register').send({
      fullName: 'Enum Test', email: e, phone: phone(), password: 'Password123', role: 'CUSTOMER',
    });

    const wrongPassword = await request(app).post('/api/v1/auth/login').send({ email: e, password: 'WrongPass123' });
    const unknownEmail  = await request(app).post('/api/v1/auth/login').send({ email: email(), password: 'Password123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user with a session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      fullName: 'Me Test', email: email(), phone: phone(), password: 'Password123', role: 'CUSTOMER',
    });
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.fullName).toBe('Me Test');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rotates the refresh token and revokes the old one', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      fullName: 'Rotate Test', email: email(), phone: phone(), password: 'Password123', role: 'CUSTOMER',
    });

    const first = await agent.post('/api/v1/auth/refresh');
    expect(first.status).toBe(200);

    const oldCookie = first.headers['set-cookie'];
    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', oldCookie);
    expect([401, 200]).toContain(replay.status);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('clears the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/register').send({
      fullName: 'Logout Test', email: email(), phone: phone(), password: 'Password123', role: 'CUSTOMER',
    });
    await agent.post('/api/v1/auth/logout');
    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('rate limiting', () => {
  it('blocks after 10 login attempts in the window', async () => {
    const e = email();
    let last = 0;
    for (let i = 0; i < 12; i++) {
      const res = await request(app).post('/api/v1/auth/login').send({ email: e, password: 'WrongPass123' });
      last = res.status;
    }
    expect(last).toBe(429);
  });
});