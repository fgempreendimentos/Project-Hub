import type { AffiliateLinkConverter } from '../../types/affiliate-link-converter';

/**
 * CONFIRMADO ao vivo em 2026-07-14, comparando dois links de afiliado reais
 * gerados no painel Shopee Afiliados: a Shopee NÃO usa um parâmetro de
 * rastreio visível como `?af_id=` — os links são short-links opacos
 * (`s.shopee.com.br/<código>`) que resolvem para
 * `shopee.com.br/opaanlp/{shopId}/{itemId}?...&mmp_pid=an_18336951204&utm_source=an_18336951204&utm_medium=affiliates&gads_t_sig={token opaco}&uls_trackid={id}&utm_campaign={id}&utm_term={id}`.
 * O `mmp_pid`/`utm_source` é fixo (identifica a conta de afiliado), mas
 * `gads_t_sig` é um token assinado — junto com `uls_trackid`/`utm_campaign`/
 * `utm_term` — diferente em cada link. Não dá pra fabricar um link válido só
 * concatenando o ID fixo numa URL de produto qualquer; a assinatura só existe
 * gerando o link de verdade pela ferramenta da Shopee (painel ou API do
 * Affiliate Open Platform, que exige App ID + Secret e requisição assinada —
 * ainda não disponível). Mesma conclusão do Mercado Livre: cada link precisa
 * ser gerado individualmente.
 *
 * Por isso `matches()` retorna sempre `false`: um `convert()` que apenas
 * grudasse um parâmetro na URL geraria um link que PARECE de afiliado mas não
 * seria reconhecido pela Shopee — a oferta seria publicada, cliques e vendas
 * aconteceriam, mas sem crédito de comissão. Rejeitar a oferta
 * (`AffiliateLinkService` retorna null e o pipeline marca "sem programa de
 * afiliado") é o comportamento seguro até existir uma integração real. Esta
 * classe também não está registrada em `config/container.ts` — o `convert()`
 * abaixo é só um placeholder mantido para quando a API estiver disponível.
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
