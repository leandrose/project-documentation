import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp, findAsyncApiFile, findOpenApiFile } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsPath = path.join(__dirname, 'fixtures/docs');
const app = createApp({ docsPath });

describe('documentation app', () => {
  it('renders Markdown documents as HTML', async () => {
    const response = await request(app).get('/md/index.md').expect(200);

    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('<aside class="documentation-sidebar">');
    expect(response.text).toContain('<h1>Welcome</h1>');
    expect(response.text).toContain('<strong>documentation</strong>');
  });

  it('uses index.md content as sidebar menu when it exists', async () => {
    const response = await request(app).get('/md/users.md').expect(200);

    expect(response.text).toContain('<aside class="documentation-sidebar">');
    expect(response.text).toContain('<h1>Welcome</h1>');
    expect(response.text).toContain('<h1>Users API</h1>');
    expect(response.text).not.toContain('<a class="active" href="/md/users.md">Users API</a>');
  });

  it('renders PlantUML blocks using the PlantUML server', async () => {
    const response = await request(app).get('/md/users.md').expect(200);

    expect(response.text).toContain('<figure class="plantuml-diagram">');
    expect(response.text).toContain('src="https://www.plantuml.com/plantuml/svg/');
    expect(response.text).toContain('alt="PlantUML diagram"');
  });

  it('computes sidebar links from markdown headings when index.md does not exist', async () => {
    const tempPath = await fs.mkdtemp(path.join(os.tmpdir(), 'project-documentation-'));
    const mdPath = path.join(tempPath, 'md');

    await fs.mkdir(mdPath, { recursive: true });
    await fs.writeFile(path.join(mdPath, 'alpha.md'), '# Alpha Page\n\nAlpha content.');
    await fs.writeFile(path.join(mdPath, 'beta.md'), '# Beta Page\n\nBeta content.');

    const tempApp = createApp({ docsPath: tempPath });
    const response = await request(tempApp).get('/md/beta.md').expect(200);

    expect(response.text).toContain('<a href="/md/alpha.md">Alpha Page</a>');
    expect(response.text).toContain('<a class="active" href="/md/beta.md">Beta Page</a>');
    expect(response.text).toContain('<h1>Beta Page</h1>');
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

  it('renders AsyncAPI documentation for the default websocket route', async () => {
    const response = await request(app).get('/websocket').expect(200);

    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('<title>Fixture WebSocket API 1.0.0 documentation</title>');
    expect(response.text).toContain('AsyncApiStandalone.render');
    expect(response.text).toContain('user/signed-up');
  });

  it('renders AsyncAPI documentation for websocket routes without an extension', async () => {
    const response = await request(app).get('/websocket/module').expect(200);

    expect(response.text).toContain('<title>Module WebSocket API 1.0.0 documentation</title>');
    expect(response.text).toContain('module/updated');
  });

  it('serves AsyncAPI specifications as YAML', async () => {
    const response = await request(app).get('/websocket/asyncapi.yaml').expect(200);

    expect(response.headers['content-type']).toContain('text/yaml');
    expect(response.text).toContain('asyncapi: 3.0.0');
    expect(response.text).toContain('title: Fixture WebSocket API');
  });

  it('blocks Markdown path traversal attempts', async () => {
    const response = await request(app).get('/md/%2e%2e/package.json');

    expect([403, 404]).toContain(response.status);
  });

  it('does not resolve OpenAPI files outside the openapi directory', async () => {
    await expect(findOpenApiFile(docsPath, '../openapi')).resolves.toBeNull();
  });

  it('does not resolve AsyncAPI files outside the websocket directory', async () => {
    await expect(findAsyncApiFile(docsPath, '../websocket')).resolves.toBeNull();
  });
});
