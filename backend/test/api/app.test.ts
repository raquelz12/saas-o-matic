import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env.ts';
import { createTestApp } from '../helpers/createTestApp.ts';

const ALLOWED = 'http://localhost:5173';
const OTHER = 'http://evil.example.com';

describe('errores transversales', () => {
  it('CA-87: GET /api/inexistente → 404 NOT_FOUND', async () => {
    const res = await request(createTestApp()).get('/api/inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('CA-88: el error tiene el formato { error: { code, message, details } }', async () => {
    const res = await request(createTestApp()).get('/api/inexistente');
    expect(res.headers['content-type']).toMatch(/^application\/json; charset=utf-8$/i);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Resource not found', details: [] },
    });
  });
});

describe('CORS', () => {
  it('el preflight OPTIONS responde 204', async () => {
    const res = await request(createTestApp())
      .options('/api/customers')
      .set('Origin', ALLOWED)
      .set('Access-Control-Request-Method', 'POST');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('una petición desde CORS_ORIGIN recibe Access-Control-Allow-Origin', async () => {
    const res = await request(createTestApp()).get('/api/inexistente').set('Origin', ALLOWED);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('una petición desde otro origen no recibe Access-Control-Allow-Origin', async () => {
    const res = await request(createTestApp()).get('/api/inexistente').set('Origin', OTHER);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('el origen permitido sale de la config', async () => {
    const app = createTestApp({ config: loadConfig({ CORS_ORIGIN: OTHER }) });
    const allowed = await request(app).get('/api/inexistente').set('Origin', OTHER);
    const rejected = await request(app).get('/api/inexistente').set('Origin', ALLOWED);
    expect(allowed.headers['access-control-allow-origin']).toBe(OTHER);
    expect(rejected.headers['access-control-allow-origin']).toBeUndefined();
  });
});
