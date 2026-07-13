import type { AffiliateLinkConverter } from '../../types/affiliate-link-converter';

/**
 * Shopee Afiliados normalmente NÃO funciona por query param simples como
 * Amazon/Mercado Livre — os links de afiliado costumam ser gerados pelo
 * painel/API do próprio programa (Shopee Affiliate/Involve Asia), resultando
 * em uma URL de rastreio totalmente diferente da URL do produto.
 *
 * Esta implementação usa um query param como placeholder e PRECISA ser
 * validada/ajustada contra o painel real do seu programa de afiliado Shopee
 * antes de operar em produção — sinalizado aqui e no checklist de validação
 * final combinado com você.
 */
export class ShopeeLinkConverter implements AffiliateLinkConverter {
  readonly platform = 'shopee';

  constructor(private readonly affiliateId: string) {}

  matches(url: string): boolean {
    return /shopee\.com\.br|shp\.ee/i.test(url);
  }

  convert(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}af_id=${this.affiliateId}`;
  }
}
