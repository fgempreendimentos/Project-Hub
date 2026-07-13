import type { RawOffer } from './raw-offer';

/** Contrato que cada fonte (Mercado Livre, Amazon, Shopee, Pelando, Promobit...) implementa. */
export interface SourceAdapter {
  readonly sourceSlug: string;
  fetchOffers(): Promise<RawOffer[]>;
}
