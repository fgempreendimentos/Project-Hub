/** Extrai valores em reais (ex.: "R$ 1.299,90") de um texto livre. Usado por
 * fontes que não expõem o preço em campos estruturados (ex.: RSS). */
export function extractPricesFromText(text: string): number[] {
  const matches = text.match(/R\$\s*([\d.]+,\d{2}|\d+)/g) ?? [];
  return matches.map((match) => {
    const numeric = match.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    return Number(numeric);
  });
}
