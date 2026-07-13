/** Converte a URL original de uma loja suportada para o link de afiliado correspondente. */
export interface AffiliateLinkConverter {
  readonly platform: string;
  matches(url: string): boolean;
  convert(url: string): string;
}
