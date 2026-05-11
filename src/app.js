import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { marked } from 'marked';
import swaggerUiDist from 'swagger-ui-dist';
import { fileURLToPath } from 'node:url';
import { buildOpenApiYaml, findOpenApiFile } from './openapi.js';
import { renderMarkdownPage, renderRedocPage, renderSwaggerPage } from './pages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.resolve(__dirname, '../public');

function safeJoin(basePath, requestPath) {
  const resolvedBasePath = path.resolve(basePath);
  const resolvedPath = path.resolve(resolvedBasePath, requestPath.replace(/^\/+/, ''));

  if (resolvedPath !== resolvedBasePath && !resolvedPath.startsWith(`${resolvedBasePath}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

function markdownTitle(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

export function createApp({ docsPath }) {
  const resolvedDocsPath = path.resolve(docsPath);
  const app = express();

  app.disable('x-powered-by');
  app.use('/assets', express.static(publicPath));
  app.use('/swagger-ui-assets', express.static(swaggerUiDist.getAbsoluteFSPath()));

  app.get('/', (_request, response) => {
    response.type('html').send(renderRedocPage({
      title: 'API Documentation',
      specUrl: '/openapi/openapi.yaml'
    }));
  });

  app.get('/swagger.html', (_request, response) => {
    response.type('html').send(renderSwaggerPage({ specUrl: '/openapi/openapi.yaml' }));
  });

  app.get('/oauth2-redirect.html', (_request, response) => {
    response.sendFile(path.join(swaggerUiDist.getAbsoluteFSPath(), 'oauth2-redirect.html'));
  });

  app.get('/md/*', async (request, response, next) => {
    try {
      const relativePath = request.params[0] || 'index.md';
      const filePath = safeJoin(path.join(resolvedDocsPath, 'md'), relativePath);

      if (!filePath) {
        return response.status(403).send('Forbidden');
      }

      const markdown = await fs.readFile(filePath, 'utf8');
      const body = marked.parse(markdown);

      return response.type('html').send(renderMarkdownPage({
        title: markdownTitle(filePath),
        body
      }));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return response.status(404).send('Markdown file not found');
      }

      return next(error);
    }
  });

  app.get('/openapi/:spec(*)', async (request, response, next) => {
    try {
      const requestedSpec = request.params.spec || 'openapi';
      const filePath = await findOpenApiFile(resolvedDocsPath, requestedSpec);

      if (!filePath) {
        return response.status(404).send('OpenAPI specification not found');
      }

      const specUrlPath = /\.(yaml|yml|json)$/i.test(requestedSpec)
        ? requestedSpec.replace(/\.(yaml|yml|json)$/i, '.yaml')
        : `${requestedSpec}.yaml`;
      const specUrl = `/openapi/${specUrlPath}`;

      if (Object.prototype.hasOwnProperty.call(request.query, 'swagger')) {
        return response.type('html').send(renderSwaggerPage({ specUrl }));
      }

      if (!/\.(yaml|yml|json)$/i.test(requestedSpec)) {
        return response.type('html').send(renderRedocPage({
          title: `${path.basename(requestedSpec)} API Documentation`,
          specUrl
        }));
      }

      const yaml = await buildOpenApiYaml(filePath);
      return response.type('yaml').send(yaml);
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    response.status(500).send(error.message || 'Internal server error');
  });

  return app;
}
