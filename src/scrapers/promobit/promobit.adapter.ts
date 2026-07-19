import * as cheerio from 'cheerio';

import type { RawOffer } from '../../types/raw-offer';
import type { SourceAdapter } from '../../types/source-adapter';
import { httpClient } from '../shared/http-client';
import { resolveFinalUrl } from '../shared/resolve-final-url';

const LISTING_URL = 'https://www.promobit.com.br/';
const BASE_URL = 'https://www.promobit.com.br';

type JsonLdOffer = {
  '@type': 'Offer';
  price: number;
  highPrice?: number | string | null;
  availability?: string;
  url: string;
};

type JsonLdProduct = {
  '@type': 'Product';
  sku: number | string;
  name: string;
  image?: string[];
  offers: JsonLdOffer[];
};

type JsonLdItemList = {
  itemListElement: { item: JsonLdProduct }[];
};

type NextData = {
  props: { pageProps: { offersToCompare?: { redirect: string }[] } };
};

/**
 * Validado ao vivo em 2026-07-14: o RSS antigo (`/rss`) não existe mais —
 * redireciona e cai em 404. A home do Promobit expõe as ofertas em destaque
 * como dados estruturados schema.org (JSON-LD, script
 * `#jsonld-home-offers-itemlist`), pensados para SEO — mais estável que
 * parsear o HTML dos cards diretamente. `highPrice` às vezes vem como texto
 * ("Cupom", "A partir de") em vez de número — itens assim são ignorados por
 * não representarem um desconto de produto calculável.
 *
 * A URL do JSON-LD aponta para a página do próprio Promobit
 * (`/oferta/{slug}/`), não para a loja — o link de saída real está no
 * `__NEXT_DATA__` dessa página, em `offersToCompare[0].redirect` (a oferta
 * de menor preço, que é a exibida como principal). Esse link passa por uma
 * cadeia de redirecionamento de rede de afiliados antes de chegar à loja;
 * `resolveFinalUrl` resolve isso.
 */
export class PromobitAdapter implements SourceAdapter {
  readonly sourceSlug = 'promobit';

  async fetchOffers(): Promise<RawOffer[]> {
    const { data: html } = await httpClient.get<string>(LISTING_URL);
    const $ = cheerio.load(html);

    const raw = $('#jsonld-home-offers-itemlist').text();
    if (!raw) {
      return [];
    }

    const itemList = JSON.parse(raw) as JsonLdItemList;

    const offers: RawOffer[] = [];
    for (const { item } of itemList.itemListElement) {
      const jsonLdOffer = item.offers[0];
      if (
        !jsonLdOffer ||
        typeof jsonLdOffer.highPrice !== 'number' ||
        jsonLdOffer.highPrice <= jsonLdOffer.price
      ) {
        continue;
      }

      const dealPageUrl = jsonLdOffer.url.startsWith('http')
        ? jsonLdOffer.url
        : `${BASE_URL}${jsonLdOffer.url}`;
      const storeUrl = await this.resolveStoreUrl(dealPageUrl);
      if (!storeUrl) {
        continue;
      }

      const offerPrice = jsonLdOffer.price;
      const originalPrice = jsonLdOffer.highPrice;
      const discountPercent =
        originalPrice > 0 ? ((originalPrice - offerPrice) / originalPrice) * 100 : 0;

      offers.push({
        externalId: String(item.sku),
        title: item.name,
        url: storeUrl,
        imageUrl: item.image?.[0],
        originalPrice,
        offerPrice,
        discountPercent: Math.round(discountPercent * 100) / 100,
        available: jsonLdOffer.availability !== 'https://schema.org/OutOfStock',
      });
    }

    return offers;
  }

  private async resolveStoreUrl(dealPageUrl: string): Promise<string | null> {
    try {
      const { data: html } = await httpClient.get<string>(dealPageUrl);
      const $ = cheerio.load(html);
      const raw = $('#__NEXT_DATA__').text();
      if (!raw) {
        return null;
      }

      const nextData = JSON.parse(raw) as NextData;
      const redirect = nextData.props.pageProps.offersToCompare?.[0]?.redirect;
      if (!redirect) {
        return null;
      }

      return await resolveFinalUrl(redirect);
    } catch {
      return null;
    }
  }
}
