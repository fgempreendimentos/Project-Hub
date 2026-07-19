import OpenAI from 'openai';

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
import { OfferPipelineService } from '../services/offer-pipeline.service';
import { StatsService } from '../services/stats.service';
import { OpenAiTextGenerator } from '../services/text/openai-text-generator';
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
// Shopee fora da lista (verificado ao vivo em 2026-07-14): o programa de
// afiliado da Shopee gera um link curto próprio por produto (s.shopee.com.br/…)
// via painel web, não um query param fixo como Amazon/ML — sem acesso à API
// do Shopee Affiliate Open Platform (App ID + Secret) não dá pra gerar isso
// programaticamente. Ofertas com destino Shopee (via Pelando/Promobit) caem
// em "sem programa de afiliado configurado" e são rejeitadas — não publica
// link sem rastreio de comissão. Reativar exigiria implementar a chamada
// assinada à API do Open Platform em ShopeeLinkConverter.
const affiliateLinkService = new AffiliateLinkService([
  new AmazonLinkConverter(env.affiliate.amazon),
  new MercadoLivreLinkConverter(env.affiliate.mercadolivre, env.affiliate.mercadolivreTool),
]);

// --- Texto: template fixo, ou IA (headline apenas) com fallback para o
// template caso a chamada à OpenAI falhe. Sem OPENAI_KEY, usa só o template.
const templateTextGenerator = new TemplateTextGenerator();
const textGenerator = env.openai.apiKey
  ? new OpenAiTextGenerator(
      new OpenAI({ apiKey: env.openai.apiKey }),
      env.openai.model,
      templateTextGenerator,
    )
  : templateTextGenerator;

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

// --- Estatísticas / Dashboard ---
// Entrada manual de ofertas do Mercado Livre reaproveita o pipeline dessa
// fonte (mesma validação/afiliado/texto/envio) — necessário porque a API de
// busca deles está bloqueada (ver comentário em startScheduler abaixo).
const statsService = new StatsService(statsRepository);
const apiRouter = buildRouter({
  statsService,
  offerRepository,
  clickRepository,
  manualOfferPipeline: pipelines.mercadolivre,
});

// --- Scheduler ---
const scheduler = new Scheduler();

function startScheduler(): void {
  // Escopo reduzido a pedido do usuário (2026-07-14): só Amazon, Mercado
  // Livre e Shopee ficam agendados; Pelando e Promobit saem por ora (fácil
  // reverter — basta descomentar as duas linhas no fim desta função).
  //
  // Mercado Livre e Shopee continuam sem produzir ofertas de verdade: ambos
  // batem em paredes reais confirmadas ao vivo em 2026-07-14, não em
  // bot-detection contornável.
  // - Mercado Livre: `/sites/{site}/search`, `/sites/{site}` e
  //   `/highlights/...` retornam 403 `PA_UNAUTHORIZED_RESULT_FROM_POLICIES`
  //   mesmo com token OAuth client_credentials válido (confirmado com app
  //   própria — `/users/me` funciona com o mesmo token, então não é
  //   problema de autenticação, é política de acesso por aplicação). A
  //   página pública de listagem redireciona para
  //   `mercadolivre.com.br/captcha/wall`. Reativar de verdade exige a ML
  //   aprovar acesso elevado para a aplicação (fora do código) —
  //   credenciais já salvas em `.env` (MERCADOLIVRE_CLIENT_ID/SECRET) para
  //   quando isso acontecer.
  // - Shopee: toda página de produto (busca, categoria, flash sale) exige
  //   login. Reativar de verdade exigiria uma sessão logada persistida
  //   (conta dedicada).
  scheduler.schedule('mercadolivre', env.schedule.mercadolivreMinutes, pipelines.mercadolivre);
  scheduler.schedule('amazon', env.schedule.amazonMinutes, pipelines.amazon);
  scheduler.schedule('shopee', env.schedule.shopeeMinutes, pipelines.shopee);
  // scheduler.schedule('pelando', env.schedule.pelandoMinutes, pipelines.pelando);
  // scheduler.schedule('promobit', env.schedule.promobitMinutes, pipelines.promobit);
}

export const container = {
  whatsappConnection,
  whatsappPublisher,
  pipelines,
  scheduler,
  startScheduler,
  apiRouter,
};
