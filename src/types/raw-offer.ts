/** Dado bruto extraído de uma fonte, antes de qualquer validação ou persistência. */
export type RawOffer = {
  externalId: string;
  title: string;
  url: string;
  imageUrl?: string;
  category?: string;
  rating?: number;
  reviewsCount?: number;
  originalPrice: number;
  offerPrice: number;
  discountPercent: number;
  shippingCost?: number;
  available: boolean;
};
