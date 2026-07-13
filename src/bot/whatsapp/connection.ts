import type { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcodeTerminal from 'qrcode-terminal';

import { env } from '../../config/env';
import { logger } from '../../utils/logger';

type ReadyListener = (socket: WASocket) => void;

/**
 * Gerencia o ciclo de vida da conexão com o WhatsApp via Baileys: exibe o QR
 * Code para pareamento, persiste a sessão e reconecta automaticamente quando
 * a conexão cai por qualquer motivo que não seja logout explícito.
 */
export class WhatsappConnection {
  private socket: WASocket | null = null;
  private readonly readyListeners: ReadyListener[] = [];

  async start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(env.whatsapp.authDir);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
    });

    this.socket = socket;

    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('Escaneie o QR Code abaixo com o WhatsApp que será usado pelo bot:');
        qrcodeTerminal.generate(qr, { small: true });
      }

      if (connection === 'open') {
        logger.info('WhatsApp conectado.');
        this.notifyReady(socket);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        logger.warn(`Conexão do WhatsApp encerrada (código ${statusCode}).`);

        if (loggedOut) {
          logger.error(
            `Sessão encerrada (logout). Apague a pasta "${env.whatsapp.authDir}" e escaneie o QR novamente.`,
          );
          return;
        }

        logger.info('Reconectando ao WhatsApp...');
        void this.start();
      }
    });
  }

  /** Chama `listener` assim que a conexão estiver pronta (inclusive após reconexões). */
  onReady(listener: ReadyListener): void {
    this.readyListeners.push(listener);
    if (this.socket) {
      listener(this.socket);
    }
  }

  getSocket(): WASocket | null {
    return this.socket;
  }

  private notifyReady(socket: WASocket): void {
    for (const listener of this.readyListeners) {
      listener(socket);
    }
  }
}
