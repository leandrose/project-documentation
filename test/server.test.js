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
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await startServer(express());
    servers.push(result.server);

    expect(result.port).toBe(4201);
    expect(log).toHaveBeenCalledWith('Project documentation server running at http://localhost:4201');
  });

  it('uses the fallback range when port 4201 is occupied', async () => {
    await occupyPort(4201);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await startServer(express());
    servers.push(result.server);

    expect(result.port).toBeGreaterThanOrEqual(33000);
    expect(result.port).toBeLessThanOrEqual(33999);
    expect(log).toHaveBeenCalledWith(`Project documentation server running at http://localhost:${result.port}`);
  });
});
