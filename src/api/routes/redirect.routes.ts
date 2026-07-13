import { Router } from 'express';

import type { ClickRepository } from '../../database/repositories/click.repository';
import type { OfferRepository } from '../../database/repositories/offer.repository';
import { logger } from '../../utils/logger';

/**
 * Endpoint que os links enviados no WhatsApp de fato apontam para (em vez do
 * link de afiliado direto): registra o clique e então redireciona para a URL
 * de afiliado real, permitindo a métrica "clique por afiliado" do dashboard.
 *
 * `channel` fica fixo em WHATSAPP por enquanto — é o único canal publicado
 * nesta etapa. Quando Telegram/Discord existirem, isso deve vir do Message
 * mais recente da oferta em vez de um valor fixo.
 */
export function redirectRoutes(
  offerRepository: OfferRepository,
  clickRepository: ClickRepository,
): Router {
  const router = Router();

  router.get('/:offerId', async (req, res) => {
    const offer = await offerRepository.findById(req.params.offerId);

    if (!offer) {
      res.status(404).send('Oferta não encontrada');
      return;
    }

    clickRepository.create(offer.id, 'WHATSAPP').catch((error) => {
      logger.error(`Falha ao registrar clique da oferta ${offer.id}: ${error}`);
    });

    res.redirect(302, offer.affiliateUrl);
  });

  return router;
}
