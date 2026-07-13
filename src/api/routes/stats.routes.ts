import { Router } from 'express';

import type { StatsService } from '../../services/stats.service';

export function statsRoutes(statsService: StatsService): Router {
  const router = Router();

  router.get('/overview', async (_req, res) => {
    res.json(await statsService.overview());
  });

  router.get('/clicks-by-affiliate', async (_req, res) => {
    res.json(await statsService.clicksByAffiliate());
  });

  router.get('/top-products', async (req, res) => {
    const limit = Number(req.query.limit ?? 10);
    res.json(await statsService.topProducts(limit));
  });

  router.get('/timeseries', async (req, res) => {
    const granularity = req.query.granularity;
    if (granularity !== 'daily' && granularity !== 'weekly' && granularity !== 'monthly') {
      res.status(400).json({ error: 'granularity deve ser daily, weekly ou monthly' });
      return;
    }
    res.json(await statsService.timeseries(granularity));
  });

  return router;
}
