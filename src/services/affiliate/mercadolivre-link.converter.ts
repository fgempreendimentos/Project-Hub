import type { AffiliateLinkConverter } from '../../types/affiliate-link-converter';

/** Mercado Livre: o Programa de Afiliados rastreia via query params
 * `matt_word`/`matt_tool` anexados à URL do produto. Confirme os valores
 * atuais no seu painel de afiliado antes de operar em produção. */
export class MercadoLivreLinkConverter implements AffiliateLinkConverter {
  readonly platform = 'mercadolivre';

  constructor(private readonly affiliateId: string) {}

  matches(url: string): boolean {
    return /mercadolivre\.com|mercadolibre\.com/i.test(url);
  }

  convert(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}matt_word=${this.affiliateId}&matt_tool=${this.affiliateId}`;
  }
}
