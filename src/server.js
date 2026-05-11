import http from 'node:http';

const DEFAULT_PORT = 4201;
const FALLBACK_START = 33000;
const FALLBACK_END = 33999;

function listenOnPort(server, port) {
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
    server.listen(port);
  });
}

async function tryPort(app, port) {
  const server = http.createServer(app);

  try {
    await listenOnPort(server, port);
    return server;
  } catch (error) {
    if (error.code !== 'EADDRINUSE') {
      throw error;
    }

    server.close();
    return null;
  }
}

function logStarted(port) {
  console.log(`Project documentation server running at http://localhost:${port}`);
}

export async function startServer(app, { port } = {}) {
  if (port) {
    const server = await tryPort(app, port);

    if (!server) {
      throw new Error(`Port ${port} is already in use`);
    }

    logStarted(port);
    return { server, port };
  }

  const defaultServer = await tryPort(app, DEFAULT_PORT);

  if (defaultServer) {
    logStarted(DEFAULT_PORT);
    return { server: defaultServer, port: DEFAULT_PORT };
  }

  for (let fallbackPort = FALLBACK_START; fallbackPort <= FALLBACK_END; fallbackPort += 1) {
    const server = await tryPort(app, fallbackPort);

    if (server) {
      logStarted(fallbackPort);
      return { server, port: fallbackPort };
    }
  }

  throw new Error(`No available port found between ${FALLBACK_START} and ${FALLBACK_END}`);
}
