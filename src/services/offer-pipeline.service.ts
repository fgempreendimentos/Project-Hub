import { env } from '../config/env';
import { HistoryRepository } from '../database/repositories/history.repository';
import { LogRepository } from '../database/repositories/log.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { OfferRepository } from '../database/repositories/offer.repository';
import { ProductRepository } from '../database/repositories/product.repository';
import { SourceRepository } from '../database/repositories/source.repository';
import type { Publisher } from '../types/publisher';
import type { RawOffer } from '../types/raw-offer';
import type { SourceAdapter } from '../types/source-adapter';
import type { TextGenerator } from '../types/text-generator';
import { logger } from '../utils/logger';
import type { AffiliateLinkService } from './affiliate/affiliate-link.service';
import { ValidatorChain } from './validation/validator-chain';

export type PipelineSummary = {
  sourceSlug: string;
  fetched: number;
  approved: number;
  rejected: number;
  sent: number;
  failed: number;
};

export type OfferOutcome =
  | { status: 'sent' }
  | { status: 'rejected'; reason: string }
  | { status: 'failed'; reason: string };

export class OfferPipelineService {
  constructor(
    private readonly adapter: SourceAdapter,
    private readonly sourceRepository: SourceRepository,
    private readonly productRepository: ProductRepository,
    private readonly offerRepository: OfferRepository,
    private readonly historyRepository: HistoryRepository,
    private readonly messageRepository: MessageRepository,
    private readonly logRepository: LogRepository,
    private readonly validatorChain: ValidatorChain,
    private readonly affiliateLinkService: AffiliateLinkService,
    private readonly textGenerator: TextGenerator,
    private readonly publishers: Publisher[],
  ) {}

  async run(): Promise<PipelineSummary> {
    const summary: PipelineSummary = {
      sourceSlug: this.adapter.sourceSlug,
      fetched: 0,
      approved: 0,
      rejected: 0,
      sent: 0,
      failed: 0,
    };

    const source = await this.sourceRepository.findBySlug(this.adapter.sourceSlug);
    if (!source) {
      logger.error(
        `Fonte "${this.adapter.sourceSlug}" não está cadastrada (rode o seed do Prisma)`,
      );
      return summary;
    }

    let rawOffers;
    try {
      rawOffers = await this.adapter.fetchOffers();
    } catch (error) {
      await this.sourceRepository.registerFailure(source.id);
      await this.logRepository.record(
        'ERROR',
        `Falha ao buscar ofertas de ${source.slug}: ${error}`,
      );
      logger.error(`Falha ao buscar ofertas de ${source.slug}: ${error}`);
      return summary;
    }

    await this.sourceRepository.registerSuccess(source.id);
    summary.fetched = rawOffers.length;

    for (const rawOffer of rawOffers) {
      await this.processOffer(rawOffer, source.id, summary);
    }

    logger.info(
      `Pipeline "${source.slug}": ${summary.fetched} encontradas, ${summary.approved} aprovadas, ${summary.rejected} rejeitadas, ${summary.sent} enviadas`,
    );

    return summary;
  }

  /** Processa uma oferta que não veio de `adapter.fetchOffers()` (ex.: link
   * colado manualmente no dashboard) pelo mesmo pipeline de validação, link de
   * afiliado, texto e envio usado pela busca automática.
   *
   * `alreadyAffiliateLink`: para fontes onde não dá pra fabricar o link de
   * afiliado a partir da URL do produto (ex.: Shopee — ver
   * `ShopeeLinkConverter`), quem cola o link no dashboard já colou o link de
   * afiliado gerado à mão no painel da loja; nesse caso pula o
   * `AffiliateLinkService` e usa `rawOffer.url` como está, em vez de tentar
   * (e falhar) convertê-lo. */
  async processManualOffer(
    rawOffer: RawOffer,
    options?: { alreadyAffiliateLink?: boolean },
  ): Promise<OfferOutcome> {
    const source = await this.sourceRepository.findBySlug(this.adapter.sourceSlug);
    if (!source) {
      return {
        status: 'failed',
        reason: `Fonte "${this.adapter.sourceSlug}" não está cadastrada (rode o seed do Prisma)`,
      };
    }

    const summary: PipelineSummary = {
      sourceSlug: source.slug,
      fetched: 1,
      approved: 0,
      rejected: 0,
      sent: 0,
      failed: 0,
    };
    return this.processOffer(rawOffer, source.id, summary, options?.alreadyAffiliateLink ?? false);
  }

  private async processOffer(
    rawOffer: RawOffer,
    sourceId: string,
    summary: PipelineSummary,
    alreadyAffiliateLink = false,
  ): Promise<OfferOutcome> {
    const product = await this.productRepository.upsert(sourceId, rawOffer);
    const dedupeHash = `${product.id}:${rawOffer.offerPrice}`;

    const [isDuplicate, historicalAveragePrice] = await Promise.all([
      this.offerRepository.existsByDedupeHash(dedupeHash),
      this.historyRepository.average(product.id),
    ]);

    const result = this.validatorChain.run(rawOffer, { isDuplicate, historicalAveragePrice });

    if (!result.approved) {
      summary.rejected++;
      const reason = `${result.rejectedBy}: ${result.reason}`;
      await this.offerRepository.create({
        productId: product.id,
        originalPrice: rawOffer.originalPrice,
        offerPrice: rawOffer.offerPrice,
        discountPercent: rawOffer.discountPercent,
        shippingCost: rawOffer.shippingCost,
        available: rawOffer.available,
        affiliateUrl: rawOffer.url,
        dedupeHash: `${dedupeHash}:${Date.now()}`,
        status: 'REJECTED',
        rejectionReason: reason,
      });
      return { status: 'rejected', reason };
    }

    const affiliateUrl = alreadyAffiliateLink
      ? rawOffer.url
      : this.affiliateLinkService.convert(rawOffer.url);
    if (!affiliateUrl) {
      summary.rejected++;
      const reason = 'Sem programa de afiliado configurado para esta loja de destino';
      await this.offerRepository.create({
        productId: product.id,
        originalPrice: rawOffer.originalPrice,
        offerPrice: rawOffer.offerPrice,
        discountPercent: rawOffer.discountPercent,
        shippingCost: rawOffer.shippingCost,
        available: rawOffer.available,
        affiliateUrl: rawOffer.url,
        dedupeHash: `${dedupeHash}:${Date.now()}`,
        status: 'REJECTED',
        rejectionReason: reason,
      });
      return { status: 'rejected', reason };
    }

    const offer = await this.offerRepository.create({
      productId: product.id,
      originalPrice: rawOffer.originalPrice,
      offerPrice: rawOffer.offerPrice,
      discountPercent: rawOffer.discountPercent,
      shippingCost: rawOffer.shippingCost,
      available: rawOffer.available,
      affiliateUrl,
      dedupeHash,
      status: 'APPROVED',
    });
    summary.approved++;

    await this.historyRepository.create(product.id, rawOffer.offerPrice, rawOffer.shippingCost);

    // O texto leva o link de rastreio (não o link de afiliado direto), para
    // que o clique passe pelo endpoint /r/:offerId e alimente a métrica de
    // "clique por afiliado" do dashboard antes de redirecionar à loja real.
    const trackedUrl = `${env.publicBaseUrl}/r/${offer.id}`;

    const content = await this.textGenerator.generate({
      title: rawOffer.title,
      originalPrice: rawOffer.originalPrice,
      offerPrice: rawOffer.offerPrice,
      discountPercent: rawOffer.discountPercent,
      rating: rawOffer.rating,
      affiliateUrl: trackedUrl,
    });

    let sentToAny = false;
    let lastError: string | undefined;
    for (const publisher of this.publishers) {
      const message = await this.messageRepository.createPending(
        offer.id,
        publisher.channel,
        content,
        rawOffer.imageUrl,
      );
      try {
        await publisher.publish({
          offerId: offer.id,
          content,
          title: rawOffer.title,
          imageUrl: rawOffer.imageUrl,
          sourceUrl: trackedUrl,
        });
        await this.messageRepository.markSent(message.id);
        sentToAny = true;
      } catch (error) {
        await this.messageRepository.markFailed(message.id, String(error));
        summary.failed++;
        lastError = String(error);
        await this.logRepository.record(
          'ERROR',
          `Falha ao publicar oferta ${offer.id} no canal ${publisher.channel}: ${error}`,
        );
      }
    }

    if (sentToAny) {
      await this.offerRepository.markSent(offer.id);
      summary.sent++;
      return { status: 'sent' };
    }
    return { status: 'failed', reason: lastError ?? 'Falha ao publicar em todos os canais' };
  }
}
