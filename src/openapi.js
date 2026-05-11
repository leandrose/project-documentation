import fs from 'node:fs/promises';
import path from 'node:path';
import SwaggerParser from '@apidevtools/swagger-parser';
import YAML from 'yaml';

const SPEC_EXTENSIONS = ['.yaml', '.yml', '.json'];

function safeResolve(basePath, requestPath) {
  const resolvedBasePath = path.resolve(basePath);
  const resolvedPath = path.resolve(resolvedBasePath, requestPath.replace(/^\/+/, ''));

  if (resolvedPath !== resolvedBasePath && !resolvedPath.startsWith(`${resolvedBasePath}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

export async function findOpenApiFile(docsPath, requestPath = 'openapi') {
  const normalized = requestPath.replace(/^\/+/, '') || 'openapi';
  const parsed = path.parse(normalized);
  const candidates = SPEC_EXTENSIONS.includes(parsed.ext.toLowerCase())
    ? [normalized]
    : SPEC_EXTENSIONS.map((extension) => `${normalized}${extension}`);
  const openApiPath = path.join(docsPath, 'openapi');

  for (const candidate of candidates) {
    const filePath = safeResolve(openApiPath, candidate);

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

export async function buildOpenApiSpec(filePath) {
  return SwaggerParser.bundle(filePath);
}

export async function buildOpenApiYaml(filePath) {
  const spec = await buildOpenApiSpec(filePath);
  return YAML.stringify(spec);
}
