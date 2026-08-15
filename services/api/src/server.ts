import dotenv from 'dotenv';
import path from 'path';

// Load env from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { prisma } from './app';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('Connecting to PostgreSQL database via Prisma...');
    // Query db to check if credentials and network connection succeed
    const res: any = await prisma.$queryRaw`SELECT NOW()`;
    console.log('PostgreSQL database connected successfully via Prisma. Current Time:', res[0].now);

    const app = require('./app').default;
    app.listen(PORT, () => {
      console.log(`Civique API running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (error) {
    console.error('Server database startup verification failed:', error);
    process.exit(1);
  }
}

startServer();
