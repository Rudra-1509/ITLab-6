import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '@dms/database';

describe('Integration: Authentication & Session Management', () => {
  it('successfully logs in with valid credentials, returning JWT and setting HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'student.rahul@university.edu',
        password: 'Password@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('student.rahul@university.edu');
    expect(res.body.data.user.role).toBe('STUDENT');
    // Ensure password hash is never leaked
    expect(res.body.data.user.passwordHash).toBeUndefined();

    // Verify Set-Cookie header
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('access_token=');
    expect(cookies[0]).toContain('HttpOnly');
  });

  it('rejects login with incorrect password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'student.rahul@university.edu',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('retrieves current authenticated session user via Bearer token', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'prof.sharma@university.edu',
        password: 'Password@123',
      });

    const token = loginRes.body.data.token;

    // 2. Fetch /me
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.email).toBe('prof.sharma@university.edu');
    expect(meRes.body.data.role).toBe('FACULTY');
    expect(meRes.body.data.facultyProfile).toBeDefined();
  });

  it('rejects /me when no authorization is provided', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('clears cookie on logout', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    // Cookie expiry in the past
    expect(cookies[0]).toContain('access_token=;');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
