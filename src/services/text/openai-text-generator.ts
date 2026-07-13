import type OpenAI from 'openai';

import type { OfferTextInput, TextGenerator } from '../../types/text-generator';
import { logger } from '../../utils/logger';

const SYSTEM_PROMPT =
  'Você escreve uma única frase curta (máximo 18 palavras), animada e direta, ' +
  'anunciando um produto em promoção para um grupo de WhatsApp de ofertas. ' +
  'Responda APENAS com essa frase, sem aspas, sem markdown, sem emojis de preço. ' +
  'NUNCA mencione preço, valor, percentual de desconto, nota ou número de ' +
  'avaliações — essas informações são adicionadas separadamente a partir dos ' +
  'dados reais, e você não tem acesso a elas.';

/**
 * A IA gera só a frase de chamada (headline) a partir do título do produto —
 * nunca vê preço, desconto ou avaliação, então não tem como inventar esses
 * números. Os valores reais são sempre montados por código determinístico em
 * `assemble()`, igual ao TemplateTextGenerator. Se a chamada à IA falhar por
 * qualquer motivo (sem chave, erro de rede, rate limit), cai para o
 * `fallback` — o sistema nunca para de publicar por causa da IA.
 */
export class OpenAiTextGenerator implements TextGenerator {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
    private readonly fallback: TextGenerator,
  ) {}

  async generate(input: OfferTextInput): Promise<string> {
    try {
      const headline = await this.generateHeadline(input.title);
      return this.assemble(input, headline);
    } catch (error) {
      logger.warn(`Falha ao gerar texto via IA, usando template padrão: ${error}`);
      return this.fallback.generate(input);
    }
  }

  private async generateHeadline(title: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Produto: ${title}` },
      ],
      max_tokens: 60,
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('Resposta vazia da OpenAI');
    }
    return text;
  }

  private assemble(input: OfferTextInput, headline: string): string {
    const rating = input.rating !== undefined ? `\n⭐ Nota ${input.rating.toFixed(1)}` : '';

    return (
      `🔥 SUPER OFERTA\n` +
      `${input.title}\n` +
      `${headline}\n\n` +
      `💰 De R$ ${input.originalPrice.toFixed(2)}\n` +
      `🔥 Por R$ ${input.offerPrice.toFixed(2)}\n` +
      `✅ Economia de ${input.discountPercent.toFixed(0)}%${rating}\n` +
      `🛒 Link:\n${input.affiliateUrl}`
    );
  }
}
