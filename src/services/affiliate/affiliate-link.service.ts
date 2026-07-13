import type { AffiliateLinkConverter } from '../../types/affiliate-link-converter';

/**
 * Resolve qual conversor usar a partir do domínio da URL de destino, não da
 * fonte que trouxe a oferta. Isso importa porque agregadores de cupom
 * (Pelando/Promobit) apontam para lojas variadas (Amazon, Mercado Livre,
 * Shopee, ou lojas ainda não suportadas) — o adapter de origem não define
 * o programa de afiliado a usar.
 */
export class AffiliateLinkService {
  constructor(private readonly converters: AffiliateLinkConverter[]) {}

  /** Retorna o link convertido, ou `null` se a loja de destino não tem programa de afiliado configurado. */
  convert(url: string): string | null {
    const converter = this.converters.find((c) => c.matches(url));
    return converter ? converter.convert(url) : null;
  }
}
