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

export async function startServer(app) {
  const defaultServer = await tryPort(app, DEFAULT_PORT);

  if (defaultServer) {
    console.log(`Project documentation server running at http://localhost:${DEFAULT_PORT}`);
    return { server: defaultServer, port: DEFAULT_PORT };
  }

  for (let port = FALLBACK_START; port <= FALLBACK_END; port += 1) {
    const server = await tryPort(app, port);

    if (server) {
      console.log(`Project documentation server running at http://localhost:${port}`);
      return { server, port };
    }
  }

  throw new Error(`No available port found between ${FALLBACK_START} and ${FALLBACK_END}`);
}
