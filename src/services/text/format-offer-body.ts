import type { OfferTextInput } from '../../types/text-generator';

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Bloco de preço/link comum aos dois geradores — sempre a partir de dados reais da oferta. */
export function formatOfferBody(input: OfferTextInput): string {
  return (
    `*${input.title}*\n\n` +
    `De: ~R$ ${formatBrl(input.originalPrice)}~\n` +
    `Por: R$ ${formatBrl(input.offerPrice)} 🔥\n\n` +
    `🛒 Link do Produto\n${input.affiliateUrl}`
  );
}
