import net from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startServer } from '../src/server.js';

const servers = [];

function occupyPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, () => {
      servers.push(server);
      resolve(server);
    });
  });
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function isPortAvailable(port) {
  const server = net.createServer();

  return new Promise((resolve) => {
    server.once('error', () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

afterEach(async () => {
  vi.restoreAllMocks();

  while (servers.length > 0) {
    await closeServer(servers.pop());
  }
});

describe('server port selection', () => {
  it('starts on port 4201 when it is available', async () => {
    if (!(await isPortAvailable(4201))) {
      return;
    }

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await startServer(express());
    servers.push(result.server);

    expect(result.port).toBe(4201);
    expect(log).toHaveBeenCalledWith('Project documentation server running at http://localhost:4201');
  });

  it('uses the fallback range when port 4201 is occupied', async () => {
    if (await isPortAvailable(4201)) {
      await occupyPort(4201);
    }

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await startServer(express());
    servers.push(result.server);

    expect(result.port).toBeGreaterThanOrEqual(33000);
    expect(result.port).toBeLessThanOrEqual(33999);
    expect(log).toHaveBeenCalledWith(`Project documentation server running at http://localhost:${result.port}`);
  });

  it('starts on a custom port when provided', async () => {
    const customPort = await getAvailablePort();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await startServer(express(), { port: customPort });
    servers.push(result.server);

    expect(result.port).toBe(customPort);
    expect(log).toHaveBeenCalledWith(`Project documentation server running at http://localhost:${customPort}`);
  });

  it('throws when the custom port is occupied', async () => {
    const customPort = await getAvailablePort();
    await occupyPort(customPort);

    await expect(startServer(express(), { port: customPort })).rejects.toThrow(`Port ${customPort} is already in use`);
  });
});
