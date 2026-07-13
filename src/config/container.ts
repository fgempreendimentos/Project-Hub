import { WhatsappConnection } from '../bot/whatsapp/connection';
import { WhatsappPublisher } from '../bot/whatsapp/whatsapp-publisher';

/**
 * Composition root: único lugar que instancia implementações concretas e as
 * injeta via construtor. Application/Domain nunca importam essas classes
 * diretamente, apenas as interfaces que elas implementam.
 */
const whatsappConnection = new WhatsappConnection();
const whatsappPublisher = new WhatsappPublisher(whatsappConnection);

export const container = {
  whatsappConnection,
  whatsappPublisher,
};
