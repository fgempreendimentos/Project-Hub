import type { RawOffer } from '../../types/raw-offer';
import type { SourceAdapter } from '../../types/source-adapter';
import { httpClient } from '../shared/http-client';
import { parseDealsRss } from '../shared/rss-deal-parser';
import { resolveFinalUrl } from '../shared/resolve-final-url';

const RSS_URL = 'https://www.pelando.com.br/rss';

/** Usa o feed RSS público do Pelando em vez de raspar o HTML da página —
 * mais estável e é o mecanismo que o próprio site oferece para consumo
 * automatizado. NÃO validado ao vivo nesta sessão (rede bloqueada no
 * ambiente de desenvolvimento); checagem final combinada para antes do deploy. */
export class PelandoAdapter implements SourceAdapter {
  readonly sourceSlug = 'pelando';

  async fetchOffers(): Promise<RawOffer[]> {
    const { data } = await httpClient.get<string>(RSS_URL);
    const candidates = parseDealsRss(data);

    return Promise.all(
      candidates.map(async (offer) => ({ ...offer, url: await resolveFinalUrl(offer.url) })),
    );
  }
}
