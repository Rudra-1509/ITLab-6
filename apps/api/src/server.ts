import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from '@dms/database';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Departmental Management System API running at http://localhost:${env.PORT}`);
  logger.info(`📚 Swagger UI documentation available at http://localhost:${env.PORT}/api/v1/docs`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down server...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connection closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnect:', err);
      process.exit(1);
    }
  });

  // Force close if graceful shutdown takes more than 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
