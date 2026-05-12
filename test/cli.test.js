import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.resolve(__dirname, '..');
const binPath = path.join(rootPath, 'bin/project-documentation.js');
const docsPath = path.join(__dirname, 'fixtures/docs');

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function runCli(args, { waitForOutput = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [binPath, ...args], {
      cwd: rootPath,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    function finish(result) {
      if (settled) {
        return;
      }

      settled = true;
      resolve(result);
    }

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`CLI timed out. stdout: ${stdout} stderr: ${stderr}`));
    }, 5000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();

      if (waitForOutput && stdout.includes('Project documentation server running')) {
        clearTimeout(timeout);
        child.kill('SIGTERM');
        finish({ stdout, stderr, code: 0 });
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      finish({ stdout, stderr, code });
    });
  });
}

describe('project-documentation CLI', () => {
  it('starts with --port and --host', async () => {
    const port = await getAvailablePort();
    const result = await runCli([docsPath, '--port', String(port), '--host', '127.0.0.1']);

    expect(result.stdout).toContain(`Project documentation server running at http://127.0.0.1:${port}`);
  });

  it('starts with --port=<value>', async () => {
    const port = await getAvailablePort();
    const result = await runCli([docsPath, `--port=${port}`, '--host=127.0.0.1']);

    expect(result.stdout).toContain(`Project documentation server running at http://127.0.0.1:${port}`);
  });

  it('rejects positional port arguments', async () => {
    const result = await runCli([docsPath, '5000'], { waitForOutput: false });

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Use --port <port> to specify a custom port');
  });
});
