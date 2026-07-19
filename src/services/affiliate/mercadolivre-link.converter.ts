import type { AffiliateLinkConverter } from '../../types/affiliate-link-converter';

/** Mercado Livre: o Programa de Afiliados rastreia via dois query params
 * diferentes — `matt_word` (palavra/ID pessoal do afiliado) e `matt_tool`
 * (ID da ferramenta/canal usado para gerar o link, não é o mesmo valor).
 * Confirmado ao vivo em 2026-07-15 gerando um link de verdade no painel do
 * usuário: os dois vêm com valores distintos, nunca são iguais. */
export class MercadoLivreLinkConverter implements AffiliateLinkConverter {
  readonly platform = 'mercadolivre';

  constructor(
    private readonly affiliateWord: string,
    private readonly toolId: string,
  ) {}

  matches(url: string): boolean {
    return /mercadolivre\.com|mercadolibre\.com/i.test(url);
  }

  convert(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}matt_word=${this.affiliateWord}&matt_tool=${this.toolId}`;
  }
}
