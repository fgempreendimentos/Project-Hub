import type OpenAI from 'openai';

import type { OfferTextInput, TextGenerator } from '../../types/text-generator';
import { logger } from '../../utils/logger';
import { formatOfferBody } from './format-offer-body';

const SYSTEM_PROMPT =
  'Você escreve uma manchete curta (máximo 8 palavras), estilo chamada de jornal, ' +
  'bem chamativa e direta, para anunciar que tem uma oferta imperdível em um grupo ' +
  'de WhatsApp. Responda APENAS com a manchete, em maiúsculas, sem aspas, sem ' +
  'markdown, sem emojis de preço. NÃO repita o nome do produto — ele aparece em ' +
  'destaque logo abaixo — e NUNCA mencione preço, valor, percentual de desconto, ' +
  'nota ou número de avaliações — essas informações são adicionadas separadamente ' +
  'a partir dos dados reais, e você não tem acesso a elas.';

/**
 * A IA gera só a manchete de chamada a partir do título do produto — nunca vê
 * preço, desconto ou avaliação, então não tem como inventar esses números. Os
 * valores reais são sempre montados por código determinístico em
 * `formatOfferBody()`, igual ao TemplateTextGenerator. Se a chamada à IA
 * falhar por qualquer motivo (sem chave, erro de rede, rate limit), cai para
 * o `fallback` — o sistema nunca para de publicar por causa da IA.
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
      return `${headline}\n\n${formatOfferBody(input)}`;
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
}
