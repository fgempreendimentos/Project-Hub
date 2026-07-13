import type { PrismaClient } from '../../generated/prisma/client';

type CreateOfferInput = {
  productId: string;
  originalPrice: number;
  offerPrice: number;
  discountPercent: number;
  shippingCost?: number;
  available: boolean;
  affiliateUrl: string;
  dedupeHash: string;
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
};

export class OfferRepository {
  constructor(private readonly prisma: PrismaClient) {}

  existsByDedupeHash(dedupeHash: string): Promise<boolean> {
    return this.prisma.offer
      .findUnique({ where: { dedupeHash }, select: { id: true } })
      .then((offer) => offer !== null);
  }

  findById(offerId: string) {
    return this.prisma.offer.findUnique({ where: { id: offerId } });
  }

  create(input: CreateOfferInput) {
    return this.prisma.offer.create({ data: input });
  }

  markSent(offerId: string) {
    return this.prisma.offer.update({ where: { id: offerId }, data: { status: 'SENT' } });
  }
}
