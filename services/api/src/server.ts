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
      console.log(`Civique API and WebSocket Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
