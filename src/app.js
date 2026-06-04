import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { marked } from 'marked';
import plantumlEncoder from 'plantuml-encoder';
import swaggerUiDist from 'swagger-ui-dist';
import { fileURLToPath } from 'node:url';
import { buildAsyncApiHtml, buildAsyncApiYaml, findAsyncApiFile } from './asyncapi.js';
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function extractMarkdownHeading(markdown, fallback) {
  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() || fallback;
}

function renderMarkdown(markdown) {
  const renderer = new marked.Renderer();
  const defaultCodeRenderer = renderer.code.bind(renderer);

  renderer.code = (token) => {
    if (token.lang?.toLowerCase() !== 'plantuml') {
      return defaultCodeRenderer(token);
    }

    const encodedDiagram = plantumlEncoder.encode(token.text);
    return `<figure class="plantuml-diagram"><img src="https://www.plantuml.com/plantuml/svg/${encodedDiagram}" alt="PlantUML diagram"></figure>`;
  };

  return marked.parse(markdown, { renderer });
}

async function markdownFiles(basePath, directory = '') {
  const directoryPath = path.join(basePath, directory);
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return markdownFiles(basePath, relativePath);
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      return relativePath.split(path.sep).join('/');
    }

    return [];
  }));

  return files.flat().sort((left, right) => left.localeCompare(right));
}

async function renderMarkdownSidebar(mdPath, currentRelativePath) {
  const indexPath = path.join(mdPath, 'index.md');

  try {
    const indexMarkdown = await fs.readFile(indexPath, 'utf8');
    return renderMarkdown(indexMarkdown);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const files = await markdownFiles(mdPath);
  const items = await Promise.all(files.map(async (file) => {
    const filePath = safeJoin(mdPath, file);
    const markdown = await fs.readFile(filePath, 'utf8');
    const fallback = path.basename(file, path.extname(file));
    const title = extractMarkdownHeading(markdown, fallback);
    const activeClass = file === currentRelativePath ? ' class="active"' : '';

    return `<li><a${activeClass} href="/md/${encodeURI(file)}">${escapeHtml(title)}</a></li>`;
  }));

  return `<nav aria-label="Markdown pages"><ul>${items.join('')}</ul></nav>`;
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

  app.get('/websocket', async (_request, response, next) => {
    try {
      const filePath = await findAsyncApiFile(resolvedDocsPath, 'asyncapi');

      if (!filePath) {
        return response.status(404).send('AsyncAPI specification not found');
      }

      const html = await buildAsyncApiHtml(filePath);
      return response.type('html').send(html);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/md/*', async (request, response, next) => {
    try {
      const relativePath = request.params[0] || 'index.md';
      const filePath = safeJoin(path.join(resolvedDocsPath, 'md'), relativePath);

      if (!filePath) {
        return response.status(403).send('Forbidden');
      }

      const markdown = await fs.readFile(filePath, 'utf8');
      const body = renderMarkdown(markdown);
      const sidebar = await renderMarkdownSidebar(path.join(resolvedDocsPath, 'md'), relativePath);

      return response.type('html').send(renderMarkdownPage({
        title: markdownTitle(filePath),
        sidebar,
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

  app.get('/websocket/:spec(*)', async (request, response, next) => {
    try {
      const requestedSpec = request.params.spec || 'asyncapi';
      const filePath = await findAsyncApiFile(resolvedDocsPath, requestedSpec);

      if (!filePath) {
        return response.status(404).send('AsyncAPI specification not found');
      }

      if (!/\.(yaml|yml|json)$/i.test(requestedSpec)) {
        const html = await buildAsyncApiHtml(filePath);
        return response.type('html').send(html);
      }

      const yaml = await buildAsyncApiYaml(filePath);
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
