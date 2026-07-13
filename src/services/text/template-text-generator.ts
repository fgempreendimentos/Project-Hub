import type { OfferTextInput, TextGenerator } from '../../types/text-generator';

/**
 * Implementação sem IA: monta o texto a partir de um template fixo, usando
 * só dados reais da oferta (nunca inventa preço/desconto). Será substituída
 * pela geração via OpenAI na Etapa 8, sem qualquer mudança no pipeline —
 * ambas implementam a mesma interface `TextGenerator`.
 */
export class TemplateTextGenerator implements TextGenerator {
  async generate(input: OfferTextInput): Promise<string> {
    const rating = input.rating !== undefined ? `\n⭐ Nota ${input.rating.toFixed(1)}` : '';

    return (
      `🔥 SUPER OFERTA\n` +
      `${input.title}\n` +
      `💰 De R$ ${input.originalPrice.toFixed(2)}\n` +
      `🔥 Por R$ ${input.offerPrice.toFixed(2)}\n` +
      `✅ Economia de ${input.discountPercent.toFixed(0)}%${rating}\n` +
      `🛒 Link:\n${input.affiliateUrl}`
    );
  }
}
