import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Generator from '@asyncapi/generator';

const SPEC_EXTENSIONS = ['.yaml', '.yml', '.json'];

function safeResolve(basePath, requestPath) {
  const resolvedBasePath = path.resolve(basePath);
  const resolvedPath = path.resolve(resolvedBasePath, requestPath.replace(/^\/+/, ''));

  if (resolvedPath !== resolvedBasePath && !resolvedPath.startsWith(`${resolvedBasePath}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

export async function findAsyncApiFile(docsPath, requestPath = 'asyncapi') {
  const normalized = requestPath.replace(/^\/+/, '') || 'asyncapi';
  const parsed = path.parse(normalized);
  const candidates = SPEC_EXTENSIONS.includes(parsed.ext.toLowerCase())
    ? [normalized]
    : SPEC_EXTENSIONS.map((extension) => `${normalized}${extension}`);
  const asyncApiPath = path.join(docsPath, 'websocket');

  for (const candidate of candidates) {
    const filePath = safeResolve(asyncApiPath, candidate);

    if (!filePath) {
      continue;
    }

    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        return filePath;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return null;
}

export async function buildAsyncApiYaml(filePath) {
  return fs.readFile(filePath, 'utf8');
}

export async function buildAsyncApiHtml(filePath) {
  const targetPath = await fs.mkdtemp(path.join(os.tmpdir(), 'project-documentation-asyncapi-'));

  try {
    const generator = new Generator('@asyncapi/html-template', targetPath, {
      compile: true,
      forceWrite: true,
      templateParams: {
        singleFile: true
      }
    });

    await generator.generateFromFile(filePath);
    return fs.readFile(path.join(targetPath, 'index.html'), 'utf8');
  } finally {
    await fs.rm(targetPath, { recursive: true, force: true });
  }
}
