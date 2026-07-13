import express from 'express';

import { env } from './config/env';
import { logger } from './utils/logger';

const app = express();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`);
});
