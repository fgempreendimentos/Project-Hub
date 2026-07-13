import { HistoryRepository } from '../database/repositories/history.repository';
import { LogRepository } from '../database/repositories/log.repository';
import { MessageRepository } from '../database/repositories/message.repository';
import { OfferRepository } from '../database/repositories/offer.repository';
import { ProductRepository } from '../database/repositories/product.repository';
import { SourceRepository } from '../database/repositories/source.repository';
import type { Publisher } from '../types/publisher';
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
      const product = await this.productRepository.upsert(source.id, rawOffer);
      const dedupeHash = `${product.id}:${rawOffer.offerPrice}`;

      const [isDuplicate, historicalAveragePrice] = await Promise.all([
        this.offerRepository.existsByDedupeHash(dedupeHash),
        this.historyRepository.average(product.id),
      ]);

      const result = this.validatorChain.run(rawOffer, { isDuplicate, historicalAveragePrice });

      if (!result.approved) {
        summary.rejected++;
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
          rejectionReason: `${result.rejectedBy}: ${result.reason}`,
        });
        continue;
      }

      const affiliateUrl = this.affiliateLinkService.convert(rawOffer.url);
      if (!affiliateUrl) {
        summary.rejected++;
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
          rejectionReason: 'Sem programa de afiliado configurado para esta loja de destino',
        });
        continue;
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

      const content = await this.textGenerator.generate({
        title: rawOffer.title,
        originalPrice: rawOffer.originalPrice,
        offerPrice: rawOffer.offerPrice,
        discountPercent: rawOffer.discountPercent,
        rating: rawOffer.rating,
        affiliateUrl,
      });

      let sentToAny = false;
      for (const publisher of this.publishers) {
        const message = await this.messageRepository.createPending(
          offer.id,
          publisher.channel,
          content,
          rawOffer.imageUrl,
        );
        try {
          await publisher.publish({ offerId: offer.id, content, imageUrl: rawOffer.imageUrl });
          await this.messageRepository.markSent(message.id);
          sentToAny = true;
        } catch (error) {
          await this.messageRepository.markFailed(message.id, String(error));
          summary.failed++;
          await this.logRepository.record(
            'ERROR',
            `Falha ao publicar oferta ${offer.id} no canal ${publisher.channel}: ${error}`,
          );
        }
      }

      if (sentToAny) {
        await this.offerRepository.markSent(offer.id);
        summary.sent++;
      }
    }

    logger.info(
      `Pipeline "${source.slug}": ${summary.fetched} encontradas, ${summary.approved} aprovadas, ${summary.rejected} rejeitadas, ${summary.sent} enviadas`,
    );

    return summary;
  }
}
