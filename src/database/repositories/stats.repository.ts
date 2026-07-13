import type { PrismaClient } from '../../generated/prisma/client';

const MAX_CLICKS_SAMPLE = 10_000;

export class StatsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async countOffersByStatus(): Promise<Record<string, number>> {
    const groups = await this.prisma.offer.groupBy({ by: ['status'], _count: { _all: true } });
    return Object.fromEntries(groups.map((group) => [group.status, group._count._all]));
  }

  countErrors(): Promise<number> {
    return this.prisma.log.count({ where: { level: 'ERROR' } });
  }

  async countSourcesByStatus(): Promise<{ online: number; offline: number }> {
    const [online, offline] = await Promise.all([
      this.prisma.source.count({ where: { status: 'ONLINE' } }),
      this.prisma.source.count({ where: { status: 'OFFLINE' } }),
    ]);
    return { online, offline };
  }

  async clicksByPlatform(): Promise<Array<{ source: string; clicks: number }>> {
    const clicks = await this.prisma.click.findMany({
      take: MAX_CLICKS_SAMPLE,
      orderBy: { clickedAt: 'desc' },
      include: { offer: { include: { product: { include: { source: true } } } } },
    });

    const counts = new Map<string, number>();
    for (const click of clicks) {
      const sourceName = click.offer.product.source.name;
      counts.set(sourceName, (counts.get(sourceName) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([source, clickCount]) => ({ source, clicks: clickCount }))
      .sort((a, b) => b.clicks - a.clicks);
  }

  async topProducts(
    limit: number,
  ): Promise<Array<{ productId: string; title: string; sentCount: number }>> {
    const groups = await this.prisma.offer.groupBy({
      by: ['productId'],
      where: { status: 'SENT' },
      _count: { _all: true },
    });

    const top = groups.sort((a, b) => b._count._all - a._count._all).slice(0, limit);

    const products = await this.prisma.product.findMany({
      where: { id: { in: top.map((group) => group.productId) } },
      select: { id: true, title: true },
    });
    const titleById = new Map(products.map((product) => [product.id, product.title]));

    return top.map((group) => ({
      productId: group.productId,
      title: titleById.get(group.productId) ?? group.productId,
      sentCount: group._count._all,
    }));
  }

  /** Retorna os timestamps de criação das ofertas enviadas desde `since` — o
   * agrupamento por dia/semana/mês é feito no StatsService, não aqui. */
  async sentOffersSince(since: Date): Promise<Date[]> {
    const offers = await this.prisma.offer.findMany({
      where: { status: 'SENT', createdAt: { gte: since } },
      select: { createdAt: true },
    });
    return offers.map((offer) => offer.createdAt);
  }
}
