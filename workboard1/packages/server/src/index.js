import { createServer } from 'http';
import app from './app.js';
import config from './config/env.js';
import logger from './config/logger.js';
import { connectDB } from './config/db.js';
import { initializeSocket } from './realtime/socket.js';

const server = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Make io available to routes
app.set('io', io);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  gracefulShutdown('unhandledRejection');
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start HTTP server
    server.listen(config.port, () => {
      logger.info(`🚀 Server running on http://localhost:${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 CORS Origin: ${config.corsOrigin}`);
      logger.info(`⚡ Socket.IO enabled for real-time features`);
      
      if (config.deepseek.apiKey) {
        logger.info(`🤖 DeepSeek AI integration enabled`);
      } else {
        logger.warn(`🤖 DeepSeek AI integration disabled (no API key)`);
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();