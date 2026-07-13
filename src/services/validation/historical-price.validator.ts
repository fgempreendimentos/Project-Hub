import type {
  OfferValidator,
  ValidationContext,
  ValidationResult,
} from '../../types/offer-validator';
import type { RawOffer } from '../../types/raw-offer';

/** Só aprova ofertas cujo preço está abaixo da média histórica do produto.
 * Sem histórico suficiente (primeira vez que vemos o produto), deixa passar
 * e essa observação passa a servir de base para as próximas comparações. */
export class HistoricalPriceValidator implements OfferValidator {
  readonly name = 'HistoricalPriceValidator';

  validate(offer: RawOffer, context: ValidationContext): ValidationResult {
    if (context.historicalAveragePrice === null) {
      return { valid: true };
    }

    if (offer.offerPrice >= context.historicalAveragePrice) {
      return {
        valid: false,
        reason: `Preço (R$ ${offer.offerPrice}) não está abaixo da média histórica (R$ ${context.historicalAveragePrice.toFixed(2)})`,
      };
    }

    return { valid: true };
  }
}
