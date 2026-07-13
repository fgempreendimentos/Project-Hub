import express from 'express';

import { container } from './config/container';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(container.apiRouter);

app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`);
});

container.whatsappConnection.start().catch((error) => {
  logger.error(`Falha ao iniciar conexão com o WhatsApp: ${error}`);
});

container.startScheduler();
