import type { WASocket } from '@whiskeysockets/baileys';

import { env } from '../../config/env';
import type { OutgoingMessage, Publisher } from '../../types/publisher';
import { logger } from '../../utils/logger';
import { RateLimitedQueue } from '../../utils/rate-limited-queue';
import type { WhatsappConnection } from './connection';

/**
 * Publisher do canal WhatsApp. Enfileira os envios (RateLimitedQueue) para
 * evitar flood, e envia texto ou imagem+legenda para o grupo configurado em
 * WHATSAPP_GROUP_ID.
 */
export class WhatsappPublisher implements Publisher {
  readonly channel = 'whatsapp' as const;

  private readonly queue: RateLimitedQueue;
  private socket: WASocket | null = null;

  constructor(connection: WhatsappConnection) {
    this.queue = new RateLimitedQueue(env.whatsapp.minIntervalMs);
    connection.onReady((socket) => {
      this.socket = socket;
    });
  }

  publish(message: OutgoingMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.enqueue(async () => {
        try {
          await this.send(message);
          resolve();
        } catch (error) {
          logger.error(`Falha ao enviar mensagem da oferta ${message.offerId}: ${error}`);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });
  }

  private async send(message: OutgoingMessage): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket do WhatsApp ainda não está conectado');
    }
    if (!env.whatsapp.groupId) {
      throw new Error('WHATSAPP_GROUP_ID não configurado');
    }

    if (message.imageUrl) {
      await this.socket.sendMessage(env.whatsapp.groupId, {
        image: { url: message.imageUrl },
        caption: message.content,
      });
    } else {
      await this.socket.sendMessage(env.whatsapp.groupId, { text: message.content });
    }

    logger.info(`Mensagem enviada ao WhatsApp (offer=${message.offerId})`);
  }
}
