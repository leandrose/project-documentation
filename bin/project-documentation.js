#!/usr/bin/env node
import path from 'node:path';
import { createApp, startServer } from '../src/index.js';

const docsPathArgument = process.argv[2];
const portArgument = process.argv[3];

function parsePort(value) {
  if (!value) {
    return undefined;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Port must be an integer between 1 and 65535');
  }

  return port;
}

if (!docsPathArgument) {
  console.error('Usage: project-documentation <docs-path> [port]');
  process.exit(1);
}

let port;

try {
  port = parsePort(portArgument);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const docsPath = path.resolve(process.cwd(), docsPathArgument);
const app = createApp({ docsPath });

try {
  await startServer(app, { port });
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
