import * as cheerio from 'cheerio';

import type { RawOffer } from '../../types/raw-offer';
import { extractPricesFromText } from './extract-price';

/**
 * Parser compartilhado para agregadores de cupom que publicam RSS (Pelando,
 * Promobit). Esses sites não expõem avaliação/nº de avaliações por produto
 * (usam "temperatura" da comunidade em vez de estrelas), então `rating` e
 * `reviewsCount` ficam de propósito fora do RawOffer — os validadores
 * correspondentes tratam a ausência desses campos como "não se aplica".
 *
 * O `url` retornado aqui é o link como veio no RSS, que em agregadores
 * costuma ser um link de redirecionamento do próprio agregador (não a loja
 * final) — cada adapter é responsável por resolver a URL final antes de
 * repassar ao AffiliateLinkService.
 */
export function parseDealsRss(xml: string): RawOffer[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const offers: RawOffer[] = [];

  $('item').each((_, element) => {
    const title = $(element).find('title').text().trim();
    const url = $(element).find('link').text().trim();
    const description = $(element).find('description').text();
    const guid = $(element).find('guid').text().trim() || url;

    const prices = [...extractPricesFromText(title), ...extractPricesFromText(description)];
    if (prices.length === 0 || !url) {
      return;
    }

    const offerPrice = Math.min(...prices);
    const originalPrice = prices.length > 1 ? Math.max(...prices) : offerPrice;
    const discountPercent =
      originalPrice > 0 ? ((originalPrice - offerPrice) / originalPrice) * 100 : 0;
    const isEnded = /encerrad|expirad|esgotad/i.test(`${title} ${description}`);

    offers.push({
      externalId: guid,
      title,
      url,
      originalPrice,
      offerPrice,
      discountPercent: Math.round(discountPercent * 100) / 100,
      available: !isEnded,
    });
  });

  return offers;
}
