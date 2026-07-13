/** Converte um texto de preço em reais (ex.: "R$ 1.299,90") para número. */
export function parseBrlPrice(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }
  const match = text.match(/([\d.]+,\d{2})/);
  if (!match?.[1]) {
    return null;
  }
  return Number(match[1].replace(/\./g, '').replace(',', '.'));
}
