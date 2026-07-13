export type OutgoingMessage = {
  offerId: string;
  content: string;
  imageUrl?: string;
};

export type PublisherChannel = 'whatsapp' | 'telegram' | 'discord';

export interface Publisher {
  readonly channel: PublisherChannel;
  publish(message: OutgoingMessage): Promise<void>;
}
