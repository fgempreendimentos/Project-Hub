import type { PrismaClient } from '../../generated/prisma/client';
import type { RawOffer } from '../../types/raw-offer';

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  upsert(sourceId: string, offer: RawOffer) {
    return this.prisma.product.upsert({
      where: { sourceId_externalId: { sourceId, externalId: offer.externalId } },
      create: {
        sourceId,
        externalId: offer.externalId,
        title: offer.title,
        url: offer.url,
        imageUrl: offer.imageUrl,
        category: offer.category,
        rating: offer.rating,
        reviewsCount: offer.reviewsCount,
      },
      update: {
        title: offer.title,
        url: offer.url,
        imageUrl: offer.imageUrl,
        rating: offer.rating,
        reviewsCount: offer.reviewsCount,
      },
    });
  }
}
