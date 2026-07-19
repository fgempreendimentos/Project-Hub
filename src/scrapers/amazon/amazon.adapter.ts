import { chromium } from 'playwright';

import type { RawOffer } from '../../types/raw-offer';
import type { SourceAdapter } from '../../types/source-adapter';
import { parseBrlPrice } from '../shared/parse-brl-price';

const DEALS_URL = 'https://www.amazon.com.br/deals';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

type ScrapedCard = {
  externalId: string | null;
  title: string | null;
  url: string | null;
  imageUrl: string | null;
  originalPriceText: string | null;
  offerPriceText: string | null;
  ratingText: string | null;
  reviewsCountText: string | null;
  availableText: string | null;
};

/**
 * Validado ao vivo em 2026-07-14: a página de ofertas usa
 * `[data-testid="product-card"]` com `data-asin` direto no elemento (sem
 * precisar extrair da URL). Amazon não expõe rating/nº de avaliações nesta
 * grade de ofertas — os validadores correspondentes tratam a ausência como
 * "não se aplica". Classes CSS com hash (`ProductCard-module__*`) mudam a
 * cada deploy da Amazon, por isso os seletores usam apenas `data-testid`,
 * `data-asin` e o id estável `title-{ASIN}`.
 */
export class AmazonAdapter implements SourceAdapter {
  readonly sourceSlug = 'amazon';

  async fetchOffers(): Promise<RawOffer[]> {
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage({ userAgent: USER_AGENT });
      await page.goto(DEALS_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page
        .waitForSelector('[data-testid="product-card"]', { timeout: 15_000 })
        .catch(() => null);

      const cards = await page.$$eval('[data-testid="product-card"]', (elements) =>
        elements.map((el) => {
          const asin = el.getAttribute('data-asin');
          const link = el.querySelector<HTMLAnchorElement>('a[data-testid="product-card-link"]');
          return {
            externalId: asin,
            title:
              (asin && el.querySelector(`#title-${asin} .a-truncate-full`)?.textContent?.trim()) ??
              null,
            url: link?.href ?? null,
            imageUrl: el.querySelector('img')?.getAttribute('src') ?? null,
            originalPriceText:
              el.querySelector('[data-testid="price-section"] .a-text-price .a-offscreen')
                ?.textContent ?? null,
            offerPriceText:
              el.querySelector('[data-testid="price-section"] .a-price .a-offscreen')
                ?.textContent ?? null,
            ratingText:
              el.querySelector('[aria-label*="de 5 estrelas"]')?.getAttribute('aria-label') ?? null,
            reviewsCountText: el.querySelector('.a-size-small .a-link-normal')?.textContent ?? null,
            availableText: el.textContent ?? null,
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

    const ratingMatch = card.ratingText?.match(/([\d,.]+)\s+de\s+5/);
    const reviewsMatch = card.reviewsCountText?.match(/([\d.,]+)/);
    const isSoldOut = /esgotado|indispon[íi]vel/i.test(card.availableText ?? '');

    return {
      externalId: card.externalId,
      title: card.title ?? card.externalId,
      url: card.url,
      imageUrl: card.imageUrl ?? undefined,
      rating: ratingMatch?.[1] ? Number(ratingMatch[1].replace(',', '.')) : undefined,
      reviewsCount: reviewsMatch?.[1] ? Number(reviewsMatch[1].replace(/\./g, '')) : undefined,
      originalPrice,
      offerPrice,
      discountPercent: Math.round(discountPercent * 100) / 100,
      available: !isSoldOut,
    };
  }
}
