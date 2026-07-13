import type { RawOffer } from '../../types/raw-offer';
import type { SourceAdapter } from '../../types/source-adapter';
import { httpClient } from '../shared/http-client';
import { parseDealsRss } from '../shared/rss-deal-parser';
import { resolveFinalUrl } from '../shared/resolve-final-url';

// URL do feed não confirmada ao vivo — Promobit costuma expor RSS neste
// caminho, mas isso está na lista de itens a validar antes do deploy.
const RSS_URL = 'https://www.promobit.com.br/rss/';

/** Mesma estratégia do PelandoAdapter (RSS em vez de HTML) — ver
 * shared/rss-deal-parser.ts para a lógica de parsing compartilhada. */
export class PromobitAdapter implements SourceAdapter {
  readonly sourceSlug = 'promobit';

  async fetchOffers(): Promise<RawOffer[]> {
    const { data } = await httpClient.get<string>(RSS_URL);
    const candidates = parseDealsRss(data);

    return Promise.all(
      candidates.map(async (offer) => ({ ...offer, url: await resolveFinalUrl(offer.url) })),
    );
  }
}
