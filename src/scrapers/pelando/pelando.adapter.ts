import type { RawOffer } from '../../types/raw-offer';
import type { SourceAdapter } from '../../types/source-adapter';
import { extractPricesFromText } from '../shared/extract-price';
import { httpClient } from '../shared/http-client';
import { extractAstroIslandProps, unwrapAstroSerialized } from '../shared/parse-astro-props';

const LISTING_URL = 'https://www.pelando.com.br/mais-quentes';

type PelandoDeal = {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  discountPercentage: number | null;
  discountFixed: number | null;
  status: string;
  sourceUrl?: string;
  imageUrl?: string;
};

/**
 * Validado ao vivo em 2026-07-14: o RSS antigo (`/rss`) não existe mais em
 * nenhum dos dois sites — ambos foram redesenhados. O Pelando hoje renderiza
 * a lista de ofertas no próprio HTML (SSR), embutida no atributo `props` do
 * Astro island que hidrata o feed (`initialDeals`) — ver
 * shared/parse-astro-props.ts. Como o site mistura cupons (sem produto/preço)
 * com ofertas de produto no mesmo feed, e o desconto só vem estruturado para
 * cupons, o preço "de" de produtos é inferido a partir de
 * discountPercentage/discountFixed quando presentes, ou de um segundo valor
 * em R$ mencionado no título (comum em posts do tipo "de R$X por R$Y");
 * quando nada disso existe, fica sem desconto conhecido e a oferta é
 * naturalmente filtrada pelo DiscountThresholdValidator.
 */
export class PelandoAdapter implements SourceAdapter {
  readonly sourceSlug = 'pelando';

  async fetchOffers(): Promise<RawOffer[]> {
    const { data: html } = await httpClient.get<string>(LISTING_URL);
    const props = extractAstroIslandProps(html, 'initialDeals');
    if (!props) {
      return [];
    }

    const deals = unwrapAstroSerialized(props.initialDeals) as PelandoDeal[];

    const offers: RawOffer[] = [];
    for (const deal of deals) {
      if (deal.price == null) {
        continue;
      }

      const offerPrice = deal.price;
      let originalPrice = offerPrice;

      if (deal.discountPercentage) {
        originalPrice = offerPrice / (1 - deal.discountPercentage / 100);
      } else if (deal.discountFixed) {
        originalPrice = offerPrice + deal.discountFixed;
      } else {
        const pricesInTitle = extractPricesFromText(deal.title);
        if (pricesInTitle.length > 0) {
          originalPrice = Math.max(offerPrice, ...pricesInTitle);
        }
      }

      const discountPercent =
        originalPrice > 0 ? ((originalPrice - offerPrice) / originalPrice) * 100 : 0;

      offers.push({
        externalId: deal.id,
        title: deal.title,
        url: deal.sourceUrl ?? `https://www.pelando.com.br/d/${deal.slug}`,
        imageUrl: deal.imageUrl,
        originalPrice: Math.round(originalPrice * 100) / 100,
        offerPrice,
        discountPercent: Math.round(discountPercent * 100) / 100,
        available: deal.status === 'active',
      });
    }

    return offers;
  }
}
