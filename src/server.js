import http from 'node:http';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4201;
const FALLBACK_START = 33000;
const FALLBACK_END = 33999;

function listenOnPort(server, port, host) {
  return new Promise((resolve, reject) => {
    function onError(error) {
      server.off('listening', onListening);
      reject(error);
    }

    function onListening() {
      server.off('error', onError);
      resolve(server);
    }

    server.once('error', onError);
    server.once('listening', onListening);

    if (host) {
      server.listen(port, host);
      return;
    }

    server.listen(port);
  });
}

async function tryPort(app, port, host) {
  const server = http.createServer(app);

  try {
    await listenOnPort(server, port, host);
    return server;
  } catch (error) {
    if (error.code !== 'EADDRINUSE') {
      throw error;
    }

    server.close();
    return null;
  }
}

function logStarted(port, host = DEFAULT_HOST) {
  console.log(`Project documentation server running at http://${host}:${port}`);
}

export async function startServer(app, { port, host = DEFAULT_HOST } = {}) {
  if (port) {
    const server = await tryPort(app, port, host);

    if (!server) {
      throw new Error(`Port ${port} is already in use`);
    }

    logStarted(port, host);
    return { server, port };
  }

  const defaultServer = await tryPort(app, DEFAULT_PORT, host);

  if (defaultServer) {
    logStarted(DEFAULT_PORT, host);
    return { server: defaultServer, port: DEFAULT_PORT };
  }

  for (let fallbackPort = FALLBACK_START; fallbackPort <= FALLBACK_END; fallbackPort += 1) {
    const server = await tryPort(app, fallbackPort, host);

    if (server) {
      logStarted(fallbackPort, host);
      return { server, port: fallbackPort };
    }
  }

  throw new Error(`No available port found between ${FALLBACK_START} and ${FALLBACK_END}`);
}
