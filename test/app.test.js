import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp, findOpenApiFile } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsPath = path.join(__dirname, 'fixtures/docs');
const app = createApp({ docsPath });

describe('documentation app', () => {
  it('renders Markdown documents as HTML', async () => {
    const response = await request(app).get('/md/index.md').expect(200);

    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('<h1>Welcome</h1>');
    expect(response.text).toContain('<strong>documentation</strong>');
  });

  it('serves processed OpenAPI specifications as YAML', async () => {
    const response = await request(app).get('/openapi/openapi.yaml').expect(200);

    expect(response.headers['content-type']).toContain('text/yaml');
    expect(response.text).toContain('openapi: 3.0.3');
    expect(response.text).toContain('title: Fixture API');
  });

  it('renders Redoc for OpenAPI routes without an extension', async () => {
    const response = await request(app).get('/openapi/openapi').expect(200);

    expect(response.text).toContain('<redoc spec-url="/openapi/openapi.yaml"></redoc>');
    expect(response.text).toContain('https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js');
  });

  it('renders Swagger UI when requested', async () => {
    const response = await request(app).get('/openapi/openapi?swagger').expect(200);

    expect(response.text).toContain('SwaggerUIBundle');
    expect(response.text).toContain('/openapi/openapi.yaml');
  });

  it('blocks Markdown path traversal attempts', async () => {
    const response = await request(app).get('/md/%2e%2e/package.json');

    expect([403, 404]).toContain(response.status);
  });

  it('does not resolve OpenAPI files outside the openapi directory', async () => {
    await expect(findOpenApiFile(docsPath, '../openapi')).resolves.toBeNull();
  });
});
