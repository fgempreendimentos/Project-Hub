import { chromium } from 'playwright';

import type { RawOffer } from '../../types/raw-offer';
import type { SourceAdapter } from '../../types/source-adapter';
import { parseBrlPrice } from '../shared/parse-brl-price';

const FLASH_SALE_URL = 'https://shopee.com.br/flash_sale';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

type ScrapedCard = {
  externalId: string | null;
  title: string | null;
  url: string | null;
  imageUrl: string | null;
  originalPriceText: string | null;
  offerPriceText: string | null;
  soldOut: boolean;
};

/**
 * Shopee é uma SPA pesada em JS com proteção anti-bot forte; os links de
 * produto seguem o padrão `.../product/<shopId>/<itemId>` ou `-i.<shopId>.<itemId>`.
 * Seletores abaixo são um ponto de partida, NÃO validados ao vivo nesta sessão
 * (rede bloqueada no ambiente de desenvolvimento). Esta é, das cinco fontes, a
 * que mais provavelmente vai exigir ajuste real na checagem final antes do
 * deploy — Shopee também não expõe avaliação/nº de avaliações nesta página de
 * flash sale, então esses campos ficam de fora (o validador de rating/reviews
 * já lida com fontes que não fornecem esses dados).
 */
export class ShopeeAdapter implements SourceAdapter {
  readonly sourceSlug = 'shopee';

  async fetchOffers(): Promise<RawOffer[]> {
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage({ userAgent: USER_AGENT });
      await page.goto(FLASH_SALE_URL, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForSelector('[data-sqe="item"]', { timeout: 15_000 }).catch(() => null);

      const cards = await page.$$eval('[data-sqe="item"]', (elements) =>
        elements.map((el) => {
          const link = el.querySelector<HTMLAnchorElement>('a[href*="-i."]');
          const idMatch = link?.href.match(/-i\.(\d+)\.(\d+)/);
          return {
            externalId: idMatch ? `${idMatch[1]}.${idMatch[2]}` : null,
            title: el.querySelector('[data-sqe="name"]')?.textContent?.trim() ?? null,
            url: link?.href ?? null,
            imageUrl: el.querySelector('img')?.getAttribute('src') ?? null,
            originalPriceText:
              el.querySelector('.original-price, [class*="original"]')?.textContent ?? null,
            offerPriceText: el.querySelector('[class*="price"]')?.textContent ?? null,
            soldOut: /esgotado/i.test(el.textContent ?? ''),
          } satisfies ScrapedCard;
        }),
      );

      return cards
        .map((card) => this.toRawOffer(card))
        .filter((offer): offer is RawOffer => offer !== null);
    } finally {
      await browser.close();
    }
  }

  private toRawOffer(card: ScrapedCard): RawOffer | null {
    if (!card.externalId || !card.url) {
      return null;
    }

    const offerPrice = parseBrlPrice(card.offerPriceText);
    const originalPrice = parseBrlPrice(card.originalPriceText) ?? offerPrice;

    if (offerPrice === null || originalPrice === null) {
      return null;
    }

    const discountPercent =
      originalPrice > 0 ? ((originalPrice - offerPrice) / originalPrice) * 100 : 0;

    return {
      externalId: card.externalId,
      title: card.title ?? card.externalId,
      url: card.url,
      imageUrl: card.imageUrl ?? undefined,
      originalPrice,
      offerPrice,
      discountPercent: Math.round(discountPercent * 100) / 100,
      available: !card.soldOut,
    };
  }
}
