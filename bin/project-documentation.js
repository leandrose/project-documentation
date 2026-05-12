#!/usr/bin/env node
import path from 'node:path';
import { createApp, startServer } from '../src/index.js';

const [docsPathArgument, ...cliArguments] = process.argv.slice(2);

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

function nextOptionValue(args, index, optionName) {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} value is required`);
  }

  return value;
}

function parseArguments(args) {
  let portArgument;
  let host;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--host') {
      host = nextOptionValue(args, index, 'Host');
      index += 1;
      continue;
    }

    if (argument.startsWith('--host=')) {
      host = argument.slice('--host='.length);

      if (!host) {
        throw new Error('Host value is required');
      }

      continue;
    }

    if (argument === '--port') {
      portArgument = nextOptionValue(args, index, 'Port');
      index += 1;
      continue;
    }

    if (argument.startsWith('--port=')) {
      portArgument = argument.slice('--port='.length);

      if (!portArgument) {
        throw new Error('Port value is required');
      }

      continue;
    }

    if (argument.startsWith('--')) {
      throw new Error(`Unknown option: ${argument}`);
    }

    throw new Error(`Unexpected argument: ${argument}. Use --port <port> to specify a custom port.`);
  }

  return { host, port: parsePort(portArgument) };
}

if (!docsPathArgument) {
  console.error('Usage: project-documentation <docs-path> [--port <port>] [--host <host>]');
  process.exit(1);
}

let port;
let host;

try {
  ({ port, host } = parseArguments(cliArguments));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (host === '0.0.0.0') {
  console.warn('Warning: binding to 0.0.0.0 exposes the documentation server to external network access.');
}

const docsPath = path.resolve(process.cwd(), docsPathArgument);
const app = createApp({ docsPath });

try {
  await startServer(app, { port, host });
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
