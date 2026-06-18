import request from 'supertest';
import { app } from '../../src/app';

describe('API Accessibility Tests', () => {
  test('GET /health returns JSON and content type', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body.status).toBe('healthy');
  });

  test('GET /api returns endpoint metadata', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body.endpoints).toBeDefined();
    expect(response.body.endpoints.health).toBe('/health');
  });

  test('GET /not-found-route returns JSON 404 response', async () => {
    const response = await request(app).get('/not-found-route');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Not Found');
    expect(response.body.path).toBe('/not-found-route');
  });
});
