import type { PrismaClient } from '../../generated/prisma/client';

const AVERAGE_SAMPLE_SIZE = 10;

export class HistoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(productId: string, price: number, shippingCost?: number) {
    return this.prisma.history.create({ data: { productId, price, shippingCost } });
  }

  async average(productId: string): Promise<number | null> {
    const recent = await this.prisma.history.findMany({
      where: { productId },
      orderBy: { observedAt: 'desc' },
      take: AVERAGE_SAMPLE_SIZE,
      select: { price: true },
    });

    if (recent.length === 0) {
      return null;
    }

    const sum = recent.reduce((acc, entry) => acc + entry.price, 0);
    return sum / recent.length;
  }
}
