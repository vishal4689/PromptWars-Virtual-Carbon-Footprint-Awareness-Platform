import request from 'supertest';
import { app } from '../../src/app';

describe('End-to-End API Smoke Tests', () => {
  test('GET / redirects to /api', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/api');
  });

  test('GET /api returns API metadata and endpoint list', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Welcome to Carbon Footprint Platform API');
    expect(response.body.endpoints.health).toBe('/health');
    expect(response.body.endpoints.auth).toBe('/api/auth');
  });

  test('GET /api/version returns version information', async () => {
    const response = await request(app).get('/api/version');
    expect(response.status).toBe(200);
    expect(response.body.version).toBe('1.0.0');
    expect(response.body.name).toContain('Carbon Footprint Platform');
  });

  test('GET /api/auth returns auth endpoint stub', async () => {
    const response = await request(app).get('/api/auth');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
  });
});
