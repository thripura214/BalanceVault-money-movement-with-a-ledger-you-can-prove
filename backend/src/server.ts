import app from './app';
import { config } from './config';
import prisma from './lib/prisma';

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`  BalanceVault Core Backend Service                `);
  console.log(`  Status: Running on port ${config.port}           `);
  console.log(`  Environment: ${config.nodeEnv}                   `);
  console.log(`  Health Check: http://localhost:${config.port}/health`);
  console.log(`  Readiness:    http://localhost:${config.port}/ready `);
  console.log(`====================================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing HTTP server and database pool...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('BalanceVault server terminated gracefully.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
