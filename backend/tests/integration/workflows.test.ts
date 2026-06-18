import request from 'supertest';
import { app } from '../../src/app';

describe('Integration Tests - API Endpoints', () => {
  test('GET /health returns healthy status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.type).toBe('application/json');
    expect(response.body.status).toBe('healthy');
    expect(typeof response.body.uptime).toBe('number');
  });

  test('GET /api returns endpoint metadata', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Carbon Footprint Platform API');
    expect(response.body.endpoints).toBeDefined();
    expect(response.body.endpoints.health).toBe('/health');
  });

  test('GET /api/auth returns auth stub', async () => {
    const response = await request(app).get('/api/auth');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('Auth API endpoint is available');
  });

  test('GET /api/activities returns supported activity types', async () => {
    const response = await request(app).get('/api/activities');
    expect(response.status).toBe(200);
    expect(response.body.supportedTypes).toContain('transportation');
  });

  test('GET /api/google returns available Google integrations', async () => {
    const response = await request(app).get('/api/google');
    expect(response.status).toBe(200);
    expect(response.body.services).toContain('Calendar');
  });
});
