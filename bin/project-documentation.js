#!/usr/bin/env node
import path from 'node:path';
import { createApp, startServer } from '../src/index.js';

const docsPathArgument = process.argv[2];

if (!docsPathArgument) {
  console.error('Usage: project-documentation <docs-path>');
  process.exit(1);
}

const docsPath = path.resolve(process.cwd(), docsPathArgument);
const app = createApp({ docsPath });

try {
  await startServer(app);
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
