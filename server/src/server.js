import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { setupSocketIO } from './sockets/socketHandler.js';

async function bootstrap() {
  await connectDB();

  const app = createApp();
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        return callback(null, origin.replace(/\/+$/, ''));
      },
      credentials: true,
    },
    pingInterval: 5000,
    pingTimeout: 5000,
  });

  setupSocketIO(io);

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${env.port} is already in use. Retrying server startup...`);
      setTimeout(() => {
        httpServer.close();
        httpServer.listen(env.port);
      }, 1000);
    } else {
      console.error('Server error:', err);
    }
  });

  httpServer.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
