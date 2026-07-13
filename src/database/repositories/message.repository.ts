import type { Channel, PrismaClient } from '../../generated/prisma/client';
import type { PublisherChannel } from '../../types/publisher';

const CHANNEL_MAP: Record<PublisherChannel, Channel> = {
  whatsapp: 'WHATSAPP',
  telegram: 'TELEGRAM',
  discord: 'DISCORD',
};

export class MessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createPending(offerId: string, channel: PublisherChannel, content: string, imageUrl?: string) {
    return this.prisma.message.create({
      data: { offerId, channel: CHANNEL_MAP[channel], content, imageUrl },
    });
  }

  markSent(messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }

  markFailed(messageId: string, error: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { status: 'FAILED', error, attempts: { increment: 1 } },
    });
  }
}
