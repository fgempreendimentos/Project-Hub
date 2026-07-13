import type { PrismaClient } from '../../generated/prisma/client';

const MAX_CONSECUTIVE_FAILURES = 3;

export class SourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findBySlug(slug: string) {
    return this.prisma.source.findUnique({ where: { slug } });
  }

  async registerSuccess(sourceId: string): Promise<void> {
    await this.prisma.source.update({
      where: { id: sourceId },
      data: {
        status: 'ONLINE',
        consecutiveFailures: 0,
        lastCheckedAt: new Date(),
        lastSuccessAt: new Date(),
      },
    });
  }

  async registerFailure(sourceId: string): Promise<void> {
    const source = await this.prisma.source.update({
      where: { id: sourceId },
      data: { consecutiveFailures: { increment: 1 }, lastCheckedAt: new Date() },
    });

    if (source.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES && source.status !== 'OFFLINE') {
      await this.prisma.source.update({ where: { id: sourceId }, data: { status: 'OFFLINE' } });
    }
  }
}
