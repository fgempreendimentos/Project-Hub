import type { WASocket, WAUrlInfo } from '@whiskeysockets/baileys';
import sharp from 'sharp';

import { env } from '../../config/env';
import { httpClient } from '../../scrapers/shared/http-client';
import type { OutgoingMessage, Publisher } from '../../types/publisher';
import { logger } from '../../utils/logger';
import { RateLimitedQueue } from '../../utils/rate-limited-queue';
import type { WhatsappConnection } from './connection';

/**
 * Publisher do canal WhatsApp. Enfileira os envios (RateLimitedQueue) para
 * evitar flood. Quando há imagem + link de rastreio, envia como texto com
 * `linkPreview` pré-montado (título + thumbnail que já temos da oferta) — gera
 * o preview nativo do WhatsApp sem depender do crawler automático do Baileys
 * buscar o /r/:offerId (o que contaria como clique falso na métrica).
 *
 * Tentativa anterior usava contextInfo.externalAdReply (card de anúncio) para
 * deixar a imagem inteira clicável — testado ao vivo em 2026-07-15: a
 * mensagem era aceita pelo socket mas descartada pelo servidor do WhatsApp
 * antes da entrega (nunca chegava ao grupo). É bloqueio de política da
 * plataforma para contas não-oficiais, não um bug no código — não reativar
 * sem confirmação de que voltou a funcionar.
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

    if (message.imageUrl && message.sourceUrl && message.title) {
      const linkPreview = await this.buildLinkPreview(message.title, message.sourceUrl, message.imageUrl);
      await this.socket.sendMessage(env.whatsapp.groupId, {
        text: message.content,
        linkPreview: linkPreview ?? null,
      });
    } else if (message.imageUrl) {
      await this.socket.sendMessage(env.whatsapp.groupId, {
        image: { url: message.imageUrl },
        caption: message.content,
      });
    } else {
      // Sem `linkPreview: null` explícito, o Baileys tentaria buscar preview
      // automaticamente a partir do link de rastreio no texto, o que bateria
      // no nosso próprio /r/:offerId e contaria como clique falso.
      await this.socket.sendMessage(env.whatsapp.groupId, { text: message.content, linkPreview: null });
    }

    logger.info(`Mensagem enviada ao WhatsApp (offer=${message.offerId})`);
  }

  private async buildLinkPreview(
    title: string,
    sourceUrl: string,
    imageUrl: string,
  ): Promise<WAUrlInfo | undefined> {
    try {
      const { data } = await httpClient.get<ArrayBuffer>(imageUrl, { responseType: 'arraybuffer' });
      // As fontes servem a imagem em qualquer formato (webp é comum no
      // Mercado Livre) — o campo jpegThumbnail exige JPEG de verdade; sem essa
      // conversão o WhatsApp descarta o thumbnail (e o preview inteiro junto).
      const jpegThumbnail = await sharp(Buffer.from(data)).resize(192).jpeg().toBuffer();
      return {
        'canonical-url': sourceUrl,
        'matched-text': sourceUrl,
        title,
        jpegThumbnail,
      };
    } catch (error) {
      logger.warn(`Falha ao gerar thumbnail para o preview de link: ${error}`);
      return undefined;
    }
  }
}
