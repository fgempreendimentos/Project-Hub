import { createHash } from 'node:crypto';

import { Router } from 'express';

import type { OfferPipelineService } from '../../services/offer-pipeline.service';
import type { RawOffer } from '../../types/raw-offer';
import { logger } from '../../utils/logger';

/** Extrai o ID do produto (ex.: MLB1234567890) do link para servir de
 * externalId/dedupe — cai num hash estável do link se não achar o padrão da
 * fonte, então links de outras lojas também funcionam. */
function extractExternalId(url: string): string {
  const match = url.match(/MLB-?(\d+)/i);
  if (match) {
    return `MLB${match[1]}`;
  }
  return `manual-${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;
}

/** Links de produto colados à mão costumam vir com query string/fragment de
 * tracking (matt_word, matt_tool_id, IDs de recomendação, variação de busca…).
 * Para Mercado Livre, mantém só origem+path: evita que um `matt_word` de
 * OUTRO afiliado (ex.: link recebido de alguém via compartilhamento) sobreviva
 * e dispute com o nosso quando o MercadoLivreLinkConverter anexa o nosso por
 * cima, e deixa o link estável para dedupe/exibição. */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (/mercadolivre\.com|mercadolibre\.com/i.test(parsed.hostname)) {
      return `${parsed.origin}${parsed.pathname}`;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Entrada manual de ofertas: cola-se o link do produto encontrado por fora
 * (a busca automática do Mercado Livre está bloqueada pela API deles — ver
 * container.ts) junto com título e preços, e a oferta passa pelo mesmo
 * pipeline de validação/afiliado/texto/envio da busca automática.
 */
export function manualOffersRoutes(pipeline: OfferPipelineService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const { url, title, originalPrice, offerPrice, imageUrl } = req.body ?? {};

    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: 'Link inválido — cole a URL completa do produto (http/https)' });
      return;
    }
    if (typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Título é obrigatório' });
      return;
    }
    const original = Number(originalPrice);
    const offer = Number(offerPrice);
    if (!Number.isFinite(original) || original <= 0) {
      res.status(400).json({ error: 'Preço original inválido' });
      return;
    }
    if (!Number.isFinite(offer) || offer <= 0) {
      res.status(400).json({ error: 'Preço da oferta inválido' });
      return;
    }
    if (offer >= original) {
      res.status(400).json({ error: 'O preço da oferta precisa ser menor que o preço original' });
      return;
    }
    if (imageUrl !== undefined && imageUrl !== '' && typeof imageUrl !== 'string') {
      res.status(400).json({ error: 'Imagem inválida' });
      return;
    }

    const discountPercent = Math.round(((original - offer) / original) * 100 * 100) / 100;
    const cleanUrl = normalizeUrl(url);

    const rawOffer: RawOffer = {
      externalId: extractExternalId(cleanUrl),
      title: title.trim(),
      url: cleanUrl,
      imageUrl: imageUrl || undefined,
      originalPrice: original,
      offerPrice: offer,
      discountPercent,
      available: true,
    };

    try {
      const outcome = await pipeline.processManualOffer(rawOffer);
      res.json(outcome);
    } catch (error) {
      logger.error(`Falha ao processar oferta manual: ${error}`);
      res.status(500).json({ error: 'Erro interno ao processar a oferta' });
    }
  });

  return router;
}
