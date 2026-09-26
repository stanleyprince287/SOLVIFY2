import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma, disconnectPrisma } from './lib/prisma.js';

async function main() {
  await prisma.$connect();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`✅ Solvify API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(async () => {
      await disconnectPrisma();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});