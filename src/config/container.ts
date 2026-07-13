import { buildRouter } from '../api/router';
import { WhatsappConnection } from '../bot/whatsapp/connection';
import { WhatsappPublisher } from '../bot/whatsapp/whatsapp-publisher';
import { prisma } from '../database/client';
import { ClickRepository } from '../database/repositories/click.repository';
import { HistoryRepository } from '../database/repositories/history.repository';
import { LogRepository } from '../database/repositories/log.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { OfferRepository } from '../database/repositories/offer.repository';
import { ProductRepository } from '../database/repositories/product.repository';
import { SourceRepository } from '../database/repositories/source.repository';
import { StatsRepository } from '../database/repositories/stats.repository';
import { AmazonAdapter } from '../scrapers/amazon/amazon.adapter';
import { MercadoLivreAdapter } from '../scrapers/mercadolivre/mercadolivre.adapter';
import { PelandoAdapter } from '../scrapers/pelando/pelando.adapter';
import { PromobitAdapter } from '../scrapers/promobit/promobit.adapter';
import { ShopeeAdapter } from '../scrapers/shopee/shopee.adapter';
import { AffiliateLinkService } from '../services/affiliate/affiliate-link.service';
import { AmazonLinkConverter } from '../services/affiliate/amazon-link.converter';
import { MercadoLivreLinkConverter } from '../services/affiliate/mercadolivre-link.converter';
import { ShopeeLinkConverter } from '../services/affiliate/shopee-link.converter';
import { OfferPipelineService } from '../services/offer-pipeline.service';
import { StatsService } from '../services/stats.service';
import { TemplateTextGenerator } from '../services/text/template-text-generator';
import { AvailabilityValidator } from '../services/validation/availability.validator';
import { DiscountThresholdValidator } from '../services/validation/discount-threshold.validator';
import { DuplicateValidator } from '../services/validation/duplicate.validator';
import { FalseDiscountValidator } from '../services/validation/false-discount.validator';
import { HistoricalPriceValidator } from '../services/validation/historical-price.validator';
import { InflatedPriceValidator } from '../services/validation/inflated-price.validator';
import { RatingValidator } from '../services/validation/rating.validator';
import { ReviewsCountValidator } from '../services/validation/reviews-count.validator';
import { ShippingAbusiveValidator } from '../services/validation/shipping-abusive.validator';
import { ValidatorChain } from '../services/validation/validator-chain';
import { Scheduler } from '../scheduler/scheduler';
import type { SourceAdapter } from '../types/source-adapter';
import { env } from './env';

/**
 * Composition root: único lugar que instancia implementações concretas e as
 * injeta via construtor. Application/Domain nunca importam essas classes
 * diretamente, apenas as interfaces que elas implementam.
 */

// --- WhatsApp ---
const whatsappConnection = new WhatsappConnection();
const whatsappPublisher = new WhatsappPublisher(whatsappConnection);

// --- Repositórios ---
const sourceRepository = new SourceRepository(prisma);
const productRepository = new ProductRepository(prisma);
const offerRepository = new OfferRepository(prisma);
const historyRepository = new HistoryRepository(prisma);
const messageRepository = new MessageRepository(prisma);
const logRepository = new LogRepository(prisma);
const clickRepository = new ClickRepository(prisma);
const statsRepository = new StatsRepository(prisma);

// --- Validação (mesma cadeia para todas as fontes) ---
const validatorChain = new ValidatorChain([
  new DuplicateValidator(),
  new AvailabilityValidator(),
  new DiscountThresholdValidator(env.validation.minDiscountPercent),
  new FalseDiscountValidator(env.validation.falseDiscountToleranceP),
  new InflatedPriceValidator(env.validation.inflatedPriceToleranceP),
  new HistoricalPriceValidator(),
  new RatingValidator(env.validation.minRating),
  new ReviewsCountValidator(env.validation.minReviewsCount),
  new ShippingAbusiveValidator(env.validation.maxShippingPercent),
]);

// --- Afiliados (resolvidos pelo domínio de destino, não pela fonte) ---
const affiliateLinkService = new AffiliateLinkService([
  new AmazonLinkConverter(env.affiliate.amazon),
  new MercadoLivreLinkConverter(env.affiliate.mercadolivre),
  new ShopeeLinkConverter(env.affiliate.shopee),
]);

// --- Texto (template fixo por enquanto; IA real entra na Etapa 8) ---
const textGenerator = new TemplateTextGenerator();

// --- Estatísticas / Dashboard ---
const statsService = new StatsService(statsRepository);
const apiRouter = buildRouter({ statsService, offerRepository, clickRepository });

// --- Pipelines, um por fonte ---
function buildPipeline(adapter: SourceAdapter) {
  return new OfferPipelineService(
    adapter,
    sourceRepository,
    productRepository,
    offerRepository,
    historyRepository,
    messageRepository,
    logRepository,
    validatorChain,
    affiliateLinkService,
    textGenerator,
    [whatsappPublisher],
  );
}

const pipelines = {
  mercadolivre: buildPipeline(new MercadoLivreAdapter()),
  amazon: buildPipeline(new AmazonAdapter()),
  shopee: buildPipeline(new ShopeeAdapter()),
  pelando: buildPipeline(new PelandoAdapter()),
  promobit: buildPipeline(new PromobitAdapter()),
};

// --- Scheduler ---
const scheduler = new Scheduler();

function startScheduler(): void {
  scheduler.schedule('mercadolivre', env.schedule.mercadolivreMinutes, pipelines.mercadolivre);
  scheduler.schedule('amazon', env.schedule.amazonMinutes, pipelines.amazon);
  scheduler.schedule('shopee', env.schedule.shopeeMinutes, pipelines.shopee);
  scheduler.schedule('pelando', env.schedule.pelandoMinutes, pipelines.pelando);
  scheduler.schedule('promobit', env.schedule.promobitMinutes, pipelines.promobit);
}

export const container = {
  whatsappConnection,
  whatsappPublisher,
  pipelines,
  scheduler,
  startScheduler,
  apiRouter,
};
