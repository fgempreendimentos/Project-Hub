import cron, { type ScheduledTask } from 'node-cron';

import type { OfferPipelineService } from '../services/offer-pipeline.service';
import { logger } from '../utils/logger';

export class Scheduler {
  private readonly tasks: ScheduledTask[] = [];

  schedule(sourceSlug: string, everyMinutes: number, pipeline: OfferPipelineService): void {
    const expression = `*/${everyMinutes} * * * *`;

    const task = cron.schedule(expression, () => {
      pipeline.run().catch((error) => {
        logger.error(`Erro não tratado no pipeline de ${sourceSlug}: ${error}`);
      });
    });

    this.tasks.push(task);
    logger.info(`Fonte "${sourceSlug}" agendada a cada ${everyMinutes} min (${expression})`);
  }

  stopAll(): void {
    for (const task of this.tasks) {
      task.stop();
    }
  }
}
