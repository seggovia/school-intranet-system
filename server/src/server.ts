import { app } from './app.js';
import { prisma } from './config/db.js';
import { env } from './config/env.js';
import { NotificationStream } from './modules/notifications/notification.service.js';

const server = app.listen(env.PORT, () => {
  console.log(`API Sistema de Intranet Escolar escuchando en http://localhost:${env.PORT}`);
});

let shuttingDown = false;

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  const timeout = setTimeout(() => {
    console.error('El cierre del servidor excedio 10 segundos. Forzando salida.');
    process.exit(1);
  }, 10000);

  try {
    const serverClosed = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    NotificationStream.closeAll();
    await serverClosed;
    await prisma.$disconnect();
    clearTimeout(timeout);
    console.log('Servidor cerrado correctamente');
    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    console.error('Error durante el cierre del servidor', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
