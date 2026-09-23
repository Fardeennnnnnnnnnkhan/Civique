import { validateEnvironment } from './utils/env';
validateEnvironment();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const app = require('./app').default;
    const http = require('http');
    const { initSocket } = require('./utils/socket');
    const { startDurableSlaJob } = require('./services/durableSla');

    const server = http.createServer(app);
    initSocket(server);
    startDurableSlaJob();

    // Force ts-node-dev reload to pick up connection_limit env variable
    server.listen(PORT, () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        service: 'api',
        module: 'server',
        operation: 'startup',
        status: 'STARTED',
        port: Number(PORT),
        environment: process.env.NODE_ENV || 'development',
      }));
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'api',
      module: 'server',
      operation: 'startup',
      status: 'ERROR',
      errorType: error instanceof Error ? error.name : 'UnknownError',
    }));
    process.exit(1);
  }
}

startServer();
