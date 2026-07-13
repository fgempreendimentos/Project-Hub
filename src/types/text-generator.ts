export type OfferTextInput = {
  title: string;
  originalPrice: number;
  offerPrice: number;
  discountPercent: number;
  rating?: number;
  affiliateUrl: string;
};

/** Gera o texto de divulgação a partir de dados reais da oferta (nunca inventa preço/desconto). */
export interface TextGenerator {
  generate(input: OfferTextInput): Promise<string>;
}
