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
 * Amazon usa proteção anti-bot agressiva e muda o HTML das páginas de ofertas
 * com frequência — os seletores abaixo são um ponto de partida razoável
 * (baseado na estrutura típica de cards de oferta), mas NÃO foram validados
 * ao vivo nesta sessão (rede bloqueada no ambiente de desenvolvimento).
 * Checagem final combinada para antes do deploy.
 */
export class AmazonAdapter implements SourceAdapter {
  readonly sourceSlug = 'amazon';

  async fetchOffers(): Promise<RawOffer[]> {
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage({ userAgent: USER_AGENT });
      await page.goto(DEALS_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page
        .waitForSelector('[data-testid="deal-card"]', { timeout: 15_000 })
        .catch(() => null);

      const cards = await page.$$eval('[data-testid="deal-card"]', (elements) =>
        elements.map((el) => {
          const link = el.querySelector<HTMLAnchorElement>('a[href*="/dp/"]');
          const asinMatch = link?.href.match(/\/dp\/([A-Z0-9]{10})/);
          return {
            externalId: asinMatch?.[1] ?? null,
            title: el.querySelector('[data-testid="deal-title"]')?.textContent?.trim() ?? null,
            url: link?.href ?? null,
            imageUrl: el.querySelector('img')?.getAttribute('src') ?? null,
            originalPriceText: el.querySelector('.a-text-price .a-offscreen')?.textContent ?? null,
            offerPriceText: el.querySelector('.a-price .a-offscreen')?.textContent ?? null,
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
