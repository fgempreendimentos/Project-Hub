import type { Channel, PrismaClient } from '../../generated/prisma/client';

export class ClickRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(offerId: string, channel: Channel) {
    return this.prisma.click.create({ data: { offerId, channel } });
  }
}
