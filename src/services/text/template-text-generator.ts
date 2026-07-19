import type { OfferTextInput, TextGenerator } from '../../types/text-generator';
import { formatOfferBody } from './format-offer-body';

/**
 * Implementação sem IA: monta o texto a partir de um template fixo, usando
 * só dados reais da oferta (nunca inventa preço/desconto). Será substituída
 * pela geração via OpenAI na Etapa 8, sem qualquer mudança no pipeline —
 * ambas implementam a mesma interface `TextGenerator`.
 */
export class TemplateTextGenerator implements TextGenerator {
  async generate(input: OfferTextInput): Promise<string> {
    return `🚨 OFERTA IMPERDÍVEL!\n\n${formatOfferBody(input)}`;
  }
}
