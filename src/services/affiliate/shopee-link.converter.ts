import type { AffiliateLinkConverter } from '../../types/affiliate-link-converter';

/**
 * CONFIRMADO (comparando dois links reais gerados pelo painel Shopee
 * Afiliados): a Shopee NÃO usa um parâmetro de rastreio visível como
 * `?af_id=` — os links de afiliado são short-links opacos
 * (`s.shopee.com.br/<código>`) onde a associação com a conta de afiliado
 * fica guardada do lado da Shopee, embutida no próprio código curto, gerado
 * individualmente por produto através da ferramenta/API deles.
 *
 * Por isso `matches()` retorna sempre `false` por enquanto: um `convert()`
 * que apenas grudasse um parâmetro na URL geraria um link que PARECE de
 * afiliado mas não seria reconhecido pela Shopee — a oferta seria publicada,
 * cliques e vendas aconteceriam, mas sem crédito de comissão. Rejeitar a
 * oferta (`AffiliateLinkService` retorna null e o pipeline marca
 * "sem programa de afiliado") é o comportamento seguro até existir uma
 * integração real (ex.: chamar a API de geração de links da Shopee
 * Afiliados por produto, se ela existir e formos aprovados para usá-la).
 */
export class ShopeeLinkConverter implements AffiliateLinkConverter {
  readonly platform = 'shopee';

  constructor(private readonly affiliateId: string) {}

  matches(_url: string): boolean {
    return false;
  }

  convert(url: string): string {
    return url;
  }
}
