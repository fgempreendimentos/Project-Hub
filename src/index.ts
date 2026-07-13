import express, { type NextFunction, type Request, type Response } from 'express';

import { container } from './config/container';
import { env } from './config/env';
import { prisma } from './database/client';
import { logger } from './utils/logger';

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(container.apiRouter);

// Tratamento global de erros: qualquer erro não capturado nas rotas cai aqui
// em vez de derrubar o processo ou vazar stack trace para o cliente.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(`Erro não tratado na API: ${error}`);
  res.status(500).json({ error: 'Erro interno' });
});

const server = app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`);
});

container.whatsappConnection.start().catch((error) => {
  logger.error(`Falha ao iniciar conexão com o WhatsApp: ${error}`);
});

container.startScheduler();

process.on('uncaughtException', (error) => {
  logger.error(`Exceção não capturada: ${error.stack ?? error}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`Promise rejeitada sem tratamento: ${reason}`);
});

function shutdown(signal: string): void {
  logger.info(`Recebido ${signal}, encerrando com segurança...`);
  container.scheduler.stopAll();
  server.close();
  prisma
    .$disconnect()
    .catch((error) => logger.error(`Falha ao desconectar do banco: ${error}`))
    .finally(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
