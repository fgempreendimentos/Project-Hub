import type { RawOffer } from '../../types/raw-offer';
import type { SourceAdapter } from '../../types/source-adapter';
import { httpClient } from '../shared/http-client';

/**
 * Usa a API pública de busca do Mercado Livre (não exige autenticação) em vez
 * de fazer scraping de HTML — mais estável e de menor risco que raspar a
 * página de resultados. Termos de busca fixos por enquanto; podem virar uma
 * configuração (tabela Settings) depois.
 *
 * NÃO validado ao vivo nesta sessão (rede bloqueada no ambiente de
 * desenvolvimento) — a checagem final ficou combinada para antes do deploy.
 */
const SEARCH_TERMS = ['notebook', 'smartphone', 'smart tv', 'fone de ouvido', 'eletrodomesticos'];

type MLSearchItem = {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  permalink: string;
  thumbnail: string;
  category_id: string;
  available_quantity: number;
  shipping?: { free_shipping?: boolean };
};

type MLSearchResponse = { results: MLSearchItem[] };

type MLReviewsResponse = { rating_average: number; paging: { total: number } };

export class MercadoLivreAdapter implements SourceAdapter {
  readonly sourceSlug = 'mercadolivre';

  async fetchOffers(): Promise<RawOffer[]> {
    const offers: RawOffer[] = [];

    for (const term of SEARCH_TERMS) {
      const { data } = await httpClient.get<MLSearchResponse>(
        'https://api.mercadolibre.com/sites/MLB/search',
        { params: { q: term } },
      );

      const withDiscount = data.results.filter(
        (item) => item.original_price !== null && item.original_price > item.price,
      );

      for (const item of withDiscount) {
        const discountPercent = item.original_price
          ? ((item.original_price - item.price) / item.original_price) * 100
          : 0;

        const { rating, reviewsCount } = await this.fetchReviews(item.id);

        offers.push({
          externalId: item.id,
          title: item.title,
          url: item.permalink,
          imageUrl: item.thumbnail,
          category: item.category_id,
          rating,
          reviewsCount,
          originalPrice: item.original_price ?? item.price,
          offerPrice: item.price,
          discountPercent: Math.round(discountPercent * 100) / 100,
          available: item.available_quantity > 0,
        });
      }
    }

    return offers;
  }

  private async fetchReviews(itemId: string): Promise<{ rating?: number; reviewsCount?: number }> {
    try {
      const { data } = await httpClient.get<MLReviewsResponse>(
        `https://api.mercadolibre.com/reviews/item/${itemId}`,
      );
      return { rating: data.rating_average, reviewsCount: data.paging?.total };
    } catch {
      return {};
    }
  }
}
