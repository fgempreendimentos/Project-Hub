import path from 'node:path';

import express, { Router } from 'express';

import type { ClickRepository } from '../database/repositories/click.repository';
import type { OfferRepository } from '../database/repositories/offer.repository';
import type { StatsService } from '../services/stats.service';
import { basicAuth } from './middleware/basic-auth.middleware';
import { redirectRoutes } from './routes/redirect.routes';
import { statsRoutes } from './routes/stats.routes';

type Dependencies = {
  statsService: StatsService;
  offerRepository: OfferRepository;
  clickRepository: ClickRepository;
};

export function buildRouter({
  statsService,
  offerRepository,
  clickRepository,
}: Dependencies): Router {
  const router = Router();

  // Link de rastreio de clique — precisa ficar público (é para onde os links
  // enviados no WhatsApp apontam), sem autenticação.
  router.use('/r', redirectRoutes(offerRepository, clickRepository));

  // Dashboard e API de estatísticas — protegidos por Basic Auth opcional.
  router.use('/api/stats', basicAuth, statsRoutes(statsService));
  router.use('/dashboard', basicAuth, express.static(path.join(__dirname, '..', 'dashboard')));

  return router;
}
